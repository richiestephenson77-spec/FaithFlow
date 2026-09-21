const prisma = require('../db');
const { createNotification } = require('../utils/notify');

// Outbound notifications for Prayer Rooms.
//
// HONEST DELIVERY NOTE: this app has no push infrastructure — no APNs, no FCM,
// no web-push, no device tokens anywhere in the codebase. `createNotification`
// writes a row and emits over socket.io to a CURRENTLY CONNECTED client. So a
// reminder reaches a user who has the app open, and otherwise waits in their
// notification list until they next open it. It will NOT wake a closed app or
// light up a lock screen. The UI must not promise otherwise, and the client
// says so where reminders are set.

/**
 * Everyone who asked to hear about this occurrence:
 *   - subscribers to the parent series, minus anyone who muted this instance
 *   - subscribers to this specific occurrence
 * The host is excluded — they do not need telling about their own session.
 *
 * @returns {Promise<Array<{ userId: string, remindMinutesBefore: number }>>}
 */
async function recipientsFor(occurrence, { excludeUserIds = [] } = {}) {
  const [seriesSubs, occSubs, mutedRows] = await Promise.all([
    prisma.prayerRoomSubscription.findMany({
      where: { seriesId: occurrence.seriesId },
      select: { userId: true, remindMinutesBefore: true },
    }),
    prisma.prayerRoomSubscription.findMany({
      where: { occurrenceId: occurrence.id, muted: false },
      select: { userId: true, remindMinutesBefore: true },
    }),
    prisma.prayerRoomSubscription.findMany({
      where: { occurrenceId: occurrence.id, muted: true },
      select: { userId: true },
    }),
  ]);

  const muted = new Set(mutedRows.map(r => r.userId));
  const excluded = new Set([...excludeUserIds, ...muted]);

  // An occurrence-level row wins over the series default, so a per-instance
  // reminder time is respected.
  const byUser = new Map();
  for (const s of seriesSubs) if (!excluded.has(s.userId)) byUser.set(s.userId, s);
  for (const s of occSubs) if (!excluded.has(s.userId)) byUser.set(s.userId, s);
  return [...byUser.entries()].map(([userId, s]) => ({
    userId,
    remindMinutesBefore: s.remindMinutesBefore,
  }));
}

/**
 * Send one notification per recipient, at most once per (occurrence, user,
 * kind) for all time. The ledger insert is the lock: a unique-violation means
 * another pass already sent it, so this one silently skips.
 *
 * That matters because the reminder sweeper runs on an interval and can
 * overlap itself or restart mid-pass.
 */
async function notifyOnce(io, { occurrenceId, userId, kind, type, message, refId, fromUser = null }) {
  try {
    await prisma.prayerRoomNotificationLog.create({ data: { occurrenceId, userId, kind } });
  } catch (err) {
    if (err.code === 'P2002') return false; // already sent — not an error
    throw err;
  }
  await createNotification(io, { userId, type, message, fromUser, refId: refId || occurrenceId });
  return true;
}

/** Fan out to every subscriber, tolerating individual failures. */
async function notifySubscribers(io, occurrence, { kind, type, message, excludeUserIds = [] }) {
  const recipients = await recipientsFor(occurrence, { excludeUserIds });
  let sent = 0;
  for (const r of recipients) {
    try {
      if (await notifyOnce(io, { occurrenceId: occurrence.id, userId: r.userId, kind, type, message })) sent++;
    } catch (err) {
      console.error(`prayerRoom notify ${kind} -> ${r.userId}:`, err.message);
    }
  }
  return sent;
}

module.exports = { recipientsFor, notifyOnce, notifySubscribers };
