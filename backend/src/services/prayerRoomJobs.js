const prisma = require('../db');
const { recipientsFor, notifyOnce } = require('./prayerRoomNotifications');
const { STALE_GRACE_MINUTES } = require('./prayerRoomService');

// Background upkeep for Prayer Rooms, following the same shape as
// services/vanishJob.js: an in-process setInterval started from index.js, with
// timer.unref() so it never holds the process open.
//
// SCALE CAVEAT, stated plainly: in-process timers mean every web dyno runs
// this pass. Correctness does not depend on there being only one — the
// notification ledger's unique key makes a duplicate send a no-op, and the
// lifecycle updates are all filtered on current state so a second worker's
// update matches zero rows. But it is polling, not scheduling. At the stated
// 100k-user target this should move to a single worker process or a real
// scheduler; it is adequate for launch volumes and is deliberately cheap.

// The furthest ahead a reminder can be requested (subscriptions cap at 1440
// minutes), plus a margin so a slow pass cannot skip a due reminder.
const SCAN_AHEAD_MS = 25 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Send any reminders that have come due.
 *
 * Due means: now >= occurrence start - the subscriber's own lead time. Each
 * send goes through notifyOnce, whose ledger insert is the idempotency lock,
 * so overlapping passes cannot double-notify.
 */
async function sweepReminders(io, now = new Date()) {
  const occurrences = await prisma.prayerRoomOccurrence.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledStartUtc: { gte: new Date(now.getTime() - 5 * 60_000), lte: new Date(now.getTime() + SCAN_AHEAD_MS) },
      series: { status: 'ACTIVE' },
    },
    include: { series: { select: { id: true, title: true, hostId: true } } },
    take: 500,
  });

  let sent = 0;
  for (const occ of occurrences) {
    let recipients;
    try {
      recipients = await recipientsFor(occ, { excludeUserIds: [occ.series.hostId] });
    } catch (err) {
      console.error(`[prayerRoomJobs] recipients for ${occ.id}:`, err.message);
      continue;
    }
    for (const r of recipients) {
      const dueAt = occ.scheduledStartUtc.getTime() - r.remindMinutesBefore * 60_000;
      if (now.getTime() < dueAt) continue;
      try {
        const ok = await notifyOnce(io, {
          occurrenceId: occ.id,
          userId: r.userId,
          kind: 'REMINDER',
          type: 'ROOM_REMINDER',
          message: `"${occ.titleOverride || occ.series.title}" starts soon`,
        });
        if (ok) sent++;
      } catch (err) {
        console.error(`[prayerRoomJobs] reminder ${occ.id} -> ${r.userId}:`, err.message);
      }
    }
  }
  return sent;
}

/**
 * Close out occurrences the world has moved past.
 *
 *  - A LIVE room whose window has elapsed with nobody connected is ended, and
 *    any interval still open is closed so no one accrues time forever after a
 *    missed disconnect event.
 *  - A SCHEDULED occurrence whose window elapsed without ever going live is
 *    marked hostNoShow and ENDED, so it stops appearing as upcoming and the
 *    reason is recorded rather than inferred.
 */
async function sweepLifecycle(now = new Date()) {
  const grace = STALE_GRACE_MINUTES * 60_000;
  const result = { ended: 0, noShows: 0, intervalsClosed: 0 };

  const live = await prisma.prayerRoomOccurrence.findMany({
    where: { status: 'LIVE' },
    select: { id: true, scheduledStartUtc: true, durationMinutes: true, actualStartedAt: true },
    take: 500,
  });
  for (const occ of live) {
    const startedAt = occ.actualStartedAt || occ.scheduledStartUtc;
    const expiresAt = startedAt.getTime() + occ.durationMinutes * 60_000 + grace;
    if (now.getTime() < expiresAt) continue;

    const stillConnected = await prisma.prayerRoomAttendance.count({
      where: { occurrenceId: occ.id, leftAt: null },
    });
    if (stillConnected > 0) continue; // a long session is not a stale one

    const closed = await prisma.prayerRoomAttendance.updateMany({
      where: { occurrenceId: occ.id, leftAt: null },
      data: { leftAt: now, closedBy: 'SWEEPER' },
    });
    // Filtered on status so a concurrent pass (or the host's own End) wins
    // once and the loser updates nothing.
    const upd = await prisma.prayerRoomOccurrence.updateMany({
      where: { id: occ.id, status: 'LIVE' },
      data: { status: 'ENDED', actualEndedAt: now },
    });
    result.ended += upd.count;
    result.intervalsClosed += closed.count;
  }

  const noShow = await prisma.prayerRoomOccurrence.findMany({
    where: { status: 'SCHEDULED' },
    select: { id: true, scheduledStartUtc: true, durationMinutes: true },
    take: 500,
  });
  for (const occ of noShow) {
    const expiresAt = occ.scheduledStartUtc.getTime() + occ.durationMinutes * 60_000 + grace;
    if (now.getTime() < expiresAt) continue;
    const upd = await prisma.prayerRoomOccurrence.updateMany({
      where: { id: occ.id, status: 'SCHEDULED' },
      data: { status: 'ENDED', actualEndedAt: now, hostNoShow: true },
    });
    result.noShows += upd.count;
  }
  return result;
}

async function runOnce(io, now = new Date()) {
  const out = { reminders: 0, ended: 0, noShows: 0, intervalsClosed: 0 };
  try {
    out.reminders = await sweepReminders(io, now);
  } catch (err) {
    console.error('[prayerRoomJobs] sweepReminders failed:', err.message);
  }
  try {
    Object.assign(out, await sweepLifecycle(now));
  } catch (err) {
    console.error('[prayerRoomJobs] sweepLifecycle failed:', err.message);
  }
  return out;
}

function startPrayerRoomJobs(io, intervalMs = DEFAULT_INTERVAL_MS) {
  runOnce(io).catch(() => {});
  const timer = setInterval(() => { runOnce(io).catch(() => {}); }, intervalMs);
  timer.unref();
  return timer;
}

module.exports = { startPrayerRoomJobs, runOnce, sweepReminders, sweepLifecycle };
