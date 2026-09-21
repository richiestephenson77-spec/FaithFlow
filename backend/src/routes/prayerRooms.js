const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { getBlockedUserIds } = require('../utils/blocks');
const { todayInZone, formatLocalDate, isValidTimeZone } = require('../utils/zonedTime');
const { provider } = require('../services/mediaProvider');
const { notifySubscribers, notifyOnce } = require('../services/prayerRoomNotifications');
const S = require('../services/prayerRoomService');

const router = express.Router();

// Creating sessions is the only write here that produces fan-out, so it gets
// its own limiter. Keyed on the user, like the reports limiter.
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Too many sessions created. Try again later.' }),
});

/** Wrap an async handler so a thrown { status } becomes a clean response. */
const h = (fn) => (req, res) => fn(req, res).catch((err) => {
  if (err?.status) return res.status(err.status).json({ error: err.message, code: err.code });
  console.error(`[prayer-rooms] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: 'Something went wrong' });
});

async function loadOccurrence(id) {
  const occ = await prisma.prayerRoomOccurrence.findUnique({
    where: { id },
    include: { series: { include: S.SERIES_INCLUDE } },
  });
  if (!occ) throw S.notFound();
  return occ;
}

async function loadSeries(id) {
  const series = await prisma.prayerRoomSeries.findUnique({
    where: { id },
    include: S.SERIES_INCLUDE,
  });
  if (!series) throw S.notFound();
  return series;
}

/** Subscription state for the viewer, so cards render the right button. */
async function viewerStateFor(occurrenceIds, seriesIds, userId) {
  const [occSubs, seriesSubs] = await Promise.all([
    prisma.prayerRoomSubscription.findMany({
      where: { userId, occurrenceId: { in: occurrenceIds } },
      select: { occurrenceId: true, muted: true },
    }),
    prisma.prayerRoomSubscription.findMany({
      where: { userId, seriesId: { in: seriesIds } },
      select: { seriesId: true },
    }),
  ]);
  const mutedOcc = new Set(occSubs.filter(s => s.muted).map(s => s.occurrenceId));
  const remindedOcc = new Set(occSubs.filter(s => !s.muted).map(s => s.occurrenceId));
  const subscribedSeries = new Set(seriesSubs.map(s => s.seriesId));
  return (occ) => ({
    reminderSet: remindedOcc.has(occ.id) || (subscribedSeries.has(occ.seriesId) && !mutedOcc.has(occ.id)),
    seriesSubscribed: subscribedSeries.has(occ.seriesId),
    isHost: occ.series.hostId === userId,
  });
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

/**
 * GET /api/prayer-rooms/discover
 * Live now, then upcoming. Only series the viewer may see are considered, so
 * restricted metadata never reaches an unauthorized user — the filter is
 * applied in the query, not after serialization.
 */
router.get('/discover', authenticate, h(async (req, res) => {
  const userId = req.user.id;
  const [visibility, blocked] = await Promise.all([
    S.visibilityFilter(userId),
    getBlockedUserIds(userId),
  ]);
  const seriesWhere = { status: 'ACTIVE', kind: 'STANDARD', AND: [visibility], hostId: { notIn: blocked } };

  // Materialize before reading so a newly created series appears immediately.
  const active = await prisma.prayerRoomSeries.findMany({ where: seriesWhere, take: 200 });
  await S.materializeMany(active);

  const now = new Date();
  const horizon = new Date(now.getTime() + S.MATERIALIZE_DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const [live, upcoming] = await Promise.all([
    prisma.prayerRoomOccurrence.findMany({
      where: { status: 'LIVE', series: seriesWhere },
      include: { series: { include: S.SERIES_INCLUDE } },
      orderBy: { actualStartedAt: 'asc' },
      take: 20,
    }),
    prisma.prayerRoomOccurrence.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledStartUtc: { gte: now, lte: horizon },
        series: seriesWhere,
      },
      include: { series: { include: S.SERIES_INCLUDE } },
      orderBy: { scheduledStartUtc: 'asc' },
      take: 40,
    }),
  ]);

  const all = [...live, ...upcoming];
  const state = await viewerStateFor(all.map(o => o.id), all.map(o => o.seriesId), userId);
  // Connected counts are read per live room only. A scheduled room has no
  // attendance and must not show a number.
  const counts = await Promise.all(live.map(o => S.connectedCount(o.id)));

  res.json({
    live: live.map((o, i) => S.serializeOccurrence(o, { connected: counts[i], viewerState: state(o) })),
    upcoming: upcoming.map(o => S.serializeOccurrence(o, { viewerState: state(o) })),
  });
}));

/**
 * GET /api/prayer-rooms/daily
 * Recurring morning/evening series. There are NO seeded official sessions —
 * if no authorized organizer has created one, this is legitimately empty and
 * the client shows its empty state.
 */
router.get('/daily', authenticate, h(async (req, res) => {
  const userId = req.user.id;
  const [visibility, blocked] = await Promise.all([
    S.visibilityFilter(userId),
    getBlockedUserIds(userId),
  ]);
  const seriesWhere = { status: 'ACTIVE', kind: 'DAILY_PRAYER', AND: [visibility], hostId: { notIn: blocked } };

  const series = await prisma.prayerRoomSeries.findMany({
    where: seriesWhere,
    include: S.SERIES_INCLUDE,
    take: 50,
  });
  await S.materializeMany(series);

  const now = new Date();
  // The NEXT occurrence of each series, in the viewer's own reading of time.
  const next = await Promise.all(series.map(s =>
    prisma.prayerRoomOccurrence.findFirst({
      where: { seriesId: s.id, status: { in: ['SCHEDULED', 'LIVE'] }, scheduledStartUtc: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
      include: { series: { include: S.SERIES_INCLUDE } },
      orderBy: { scheduledStartUtc: 'asc' },
    })
  ));

  const found = next.filter(Boolean);
  const state = await viewerStateFor(found.map(o => o.id), found.map(o => o.seriesId), userId);
  const counts = await Promise.all(found.map(o => (o.status === 'LIVE' ? S.connectedCount(o.id) : null)));

  res.json({
    sessions: found.map((o, i) => S.serializeOccurrence(o, { connected: counts[i], viewerState: state(o) })),
  });
}));

/**
 * GET /api/prayer-rooms/mine
 * Upcoming (subscribed or hosted), hosted sessions, and past attendance.
 * Attendance is the viewer's OWN — never anyone else's.
 */
router.get('/mine', authenticate, h(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const hostedSeries = await prisma.prayerRoomSeries.findMany({
    where: { hostId: userId, status: 'ACTIVE' },
    include: S.SERIES_INCLUDE,
  });
  await S.materializeMany(hostedSeries);

  const subs = await prisma.prayerRoomSubscription.findMany({
    where: { userId },
    select: { seriesId: true, occurrenceId: true, muted: true },
  });
  const subSeriesIds = subs.filter(s => s.seriesId).map(s => s.seriesId);
  const subOccIds = subs.filter(s => s.occurrenceId && !s.muted).map(s => s.occurrenceId);
  const mutedOccIds = subs.filter(s => s.muted).map(s => s.occurrenceId);

  const [upcoming, pastIntervals] = await Promise.all([
    prisma.prayerRoomOccurrence.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LIVE'] },
        scheduledStartUtc: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        id: { notIn: mutedOccIds },
        OR: [
          { seriesId: { in: [...subSeriesIds, ...hostedSeries.map(s => s.id)] } },
          { id: { in: subOccIds } },
        ],
      },
      include: { series: { include: S.SERIES_INCLUDE } },
      orderBy: { scheduledStartUtc: 'asc' },
      take: 40,
    }),
    // Past attendance: only intervals belonging to this user.
    prisma.prayerRoomAttendance.findMany({
      where: { userId, occurrence: { status: 'ENDED' } },
      include: { occurrence: { include: { series: { include: S.SERIES_INCLUDE } } } },
      orderBy: { joinedAt: 'desc' },
      take: 200,
    }),
  ]);

  // Group this user's intervals per occurrence and merge them, so a reconnect
  // reads as one attended session, not two.
  const byOccurrence = new Map();
  for (const iv of pastIntervals) {
    if (!byOccurrence.has(iv.occurrenceId)) byOccurrence.set(iv.occurrenceId, { occ: iv.occurrence, intervals: [] });
    byOccurrence.get(iv.occurrenceId).intervals.push(iv);
  }
  const past = [...byOccurrence.values()]
    .map(({ occ, intervals }) => ({
      ...S.serializeOccurrence(occ),
      connectedSeconds: S.sumConnectedSeconds(intervals, now),
    }))
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, 50);

  const state = await viewerStateFor(upcoming.map(o => o.id), upcoming.map(o => o.seriesId), userId);
  const counts = await Promise.all(upcoming.map(o => (o.status === 'LIVE' ? S.connectedCount(o.id) : null)));

  // A private, factual summary. Not a ranking, not a streak: connected time is
  // not proof of prayer, and no qualifying-streak rule has been agreed.
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = past.filter(p => new Date(p.startsAt) >= weekAgo);
  res.json({
    upcoming: upcoming.map((o, i) => S.serializeOccurrence(o, { connected: counts[i], viewerState: state(o) })),
    hosted: hostedSeries.map(s => ({
      id: s.id, title: s.title, recurrence: s.recurrence, localTime: s.localTime,
      timeZone: s.timeZone, audience: s.audience, cell: s.cell,
    })),
    past,
    summary: {
      sessionsThisWeek: thisWeek.length,
      connectedSecondsThisWeek: thisWeek.reduce((n, p) => n + p.connectedSeconds, 0),
    },
  });
}));

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

router.get('/occurrences/:id', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertCanView(occ.series, req.user.id);

  const [connected, links, state, roles] = await Promise.all([
    occ.status === 'LIVE' ? S.connectedCount(occ.id) : Promise.resolve(null),
    prisma.prayerRoomLinkedRequest.findMany({
      where: { occurrenceId: occ.id },
      include: {
        prayerRequest: {
          select: { id: true, title: true, body: true, visibility: true, isAnonymous: true, userId: true,
                    user: { select: { id: true, name: true, profilePhoto: true } } },
        },
      },
    }),
    viewerStateFor([occ.id], [occ.seriesId], req.user.id),
    prisma.prayerRoomRole.findMany({
      where: { seriesId: occ.seriesId },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    }),
  ]);

  // A linked request is shown only if the VIEWER is independently entitled to
  // it. Being in the room does not widen a private request's audience.
  const visibleLinks = links.filter(l =>
    l.prayerRequest.visibility === 'PUBLIC' || l.prayerRequest.userId === req.user.id);

  res.json({
    ...S.serializeOccurrence(occ, { connected, viewerState: state(occ) }),
    cohosts: roles.filter(r => r.role === 'COHOST').map(r => r.user),
    canManage: S.isOwner(occ.series, req.user.id),
    canHost: await S.isHostOrCohost(occ.series, req.user.id),
    linkedRequests: visibleLinks.map(l => ({
      id: l.prayerRequest.id,
      title: l.prayerRequest.title,
      body: l.prayerRequest.body,
      author: l.prayerRequest.isAnonymous ? null : l.prayerRequest.user,
    })),
    // Disclosed BEFORE joining, per the attendance-privacy requirement.
    attendanceNotice: 'The host can see that you joined and how long you stayed.',
    liveAudio: { available: provider.isConfigured(), provider: provider.name },
  });
}));

// ---------------------------------------------------------------------------
// Creation and management
// ---------------------------------------------------------------------------

router.post('/', authenticate, createLimiter, h(async (req, res) => {
  const userId = req.user.id;
  const input = S.parseSeriesInput(req.body);

  if (input.cellId) await S.assertMayOrganizeForCell(input.cellId, userId);
  if (input.kind === 'DAILY_PRAYER' && input.recurrence === 'NONE') {
    throw S.invalid('A daily prayer series must repeat');
  }

  // Duplicate-submission guard: the same host posting the same title and start
  // within a minute is a double tap, not two sessions.
  const dupe = await prisma.prayerRoomSeries.findFirst({
    where: {
      hostId: userId, title: input.title,
      startLocalDate: input.startLocalDate, localTime: input.localTime,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    include: S.SERIES_INCLUDE,
  });
  if (dupe) {
    const existing = await prisma.prayerRoomOccurrence.findFirst({
      where: { seriesId: dupe.id }, orderBy: { scheduledStartUtc: 'asc' },
      include: { series: { include: S.SERIES_INCLUDE } },
    });
    return res.status(200).json({ series: dupe, occurrence: existing ? S.serializeOccurrence(existing) : null, deduplicated: true });
  }

  const series = await prisma.prayerRoomSeries.create({
    data: { ...input, hostId: userId },
    include: S.SERIES_INCLUDE,
  });
  await S.materializeSeries(series);

  // Invitees named at creation time.
  const inviteeIds = [...new Set((req.body.inviteeIds || []).map(String))].filter(id => id !== userId).slice(0, 100);
  const cohostIds = [...new Set((req.body.cohostIds || []).map(String))].filter(id => id !== userId).slice(0, 20);
  if (inviteeIds.length || cohostIds.length) {
    await prisma.prayerRoomRole.createMany({
      data: [
        ...cohostIds.map(uid => ({ seriesId: series.id, userId: uid, role: 'COHOST' })),
        ...inviteeIds.filter(id => !cohostIds.includes(id)).map(uid => ({ seriesId: series.id, userId: uid, role: 'INVITEE' })),
      ],
      skipDuplicates: true,
    });
  }

  const first = await prisma.prayerRoomOccurrence.findFirst({
    where: { seriesId: series.id }, orderBy: { scheduledStartUtc: 'asc' },
    include: { series: { include: S.SERIES_INCLUDE } },
  });

  // Tell invitees once. Fire-and-forget after the response, like the cell routes.
  const io = req.app.get('io');
  if (first) {
    for (const uid of [...cohostIds, ...inviteeIds]) {
      notifyOnce(io, {
        occurrenceId: first.id, userId: uid, kind: 'INVITED', type: 'ROOM_INVITED',
        message: `${req.user.email ? '' : ''}You were invited to "${series.title}"`,
        fromUser: userId,
      }).catch(() => {});
    }
  }

  res.status(201).json({ series, occurrence: first ? S.serializeOccurrence(first) : null });
}));

/**
 * POST /api/prayer-rooms/start-now
 * A spontaneous session is the same model: a one-off series anchored to the
 * host's current wall clock, with its single occurrence opened immediately.
 */
router.post('/start-now', authenticate, createLimiter, h(async (req, res) => {
  const userId = req.user.id;
  const timeZone = String(req.body.timeZone || '');
  if (!isValidTimeZone(timeZone)) throw S.invalid('Pick a valid time zone');

  const now = new Date();
  const local = todayInZone(timeZone, now);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' })
    .formatToParts(now).reduce((a, p) => (p.type !== 'literal' ? { ...a, [p.type]: p.value } : a), {});

  const input = S.parseSeriesInput({
    ...req.body,
    recurrence: 'NONE',
    kind: 'STANDARD',
    startLocalDate: formatLocalDate(local),
    localTime: `${parts.hour}:${parts.minute}`,
    timeZone,
  });
  if (input.cellId) await S.assertMayOrganizeForCell(input.cellId, userId);

  const series = await prisma.prayerRoomSeries.create({
    data: { ...input, hostId: userId },
    include: S.SERIES_INCLUDE,
  });

  // Anchor the occurrence to `now` exactly rather than to the rounded wall
  // clock, so "starts at" matches when the host actually opened it.
  const occ = await prisma.prayerRoomOccurrence.create({
    data: {
      seriesId: series.id,
      scheduledStartUtc: now,
      durationMinutes: input.durationMinutes,
      status: 'LIVE',
      actualStartedAt: now,
    },
    include: { series: { include: S.SERIES_INCLUDE } },
  });

  res.status(201).json({ occurrence: S.serializeOccurrence(occ, { connected: 0 }) });
}));

/** PATCH one occurrence — "this occurrence only". */
router.patch('/occurrences/:id', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  S.assertOwner(occ.series, req.user.id);
  if (occ.status === 'ENDED') throw S.invalid('That session has already finished');

  const data = {};
  if (req.body.title !== undefined) data.titleOverride = String(req.body.title).trim().slice(0, 120) || null;
  if (req.body.description !== undefined) data.descriptionOverride = String(req.body.description).trim().slice(0, 2000) || null;

  // A reschedule keeps the original instant on the row so history and the
  // subscriber message can both reference it.
  let rescheduled = false;
  if (req.body.startsAt) {
    const next = new Date(req.body.startsAt);
    if (Number.isNaN(next.getTime())) throw S.invalid('Invalid new start time');
    if (next.getTime() !== occ.scheduledStartUtc.getTime()) {
      data.rescheduledFromUtc = occ.scheduledStartUtc;
      data.scheduledStartUtc = next;
      rescheduled = true;
    }
  }
  if (Object.keys(data).length === 0) return res.json(S.serializeOccurrence(occ));

  const updated = await prisma.prayerRoomOccurrence.update({
    where: { id: occ.id }, data,
    include: { series: { include: S.SERIES_INCLUDE } },
  });

  if (rescheduled) {
    await notifySubscribers(req.app.get('io'), updated, {
      kind: 'RESCHEDULED', type: 'ROOM_RESCHEDULED',
      message: `"${updated.titleOverride || updated.series.title}" has been moved`,
      excludeUserIds: [req.user.id],
    });
  }
  res.json(S.serializeOccurrence(updated));
}));

/** PATCH the series — "this and all future occurrences". */
router.patch('/series/:id', authenticate, h(async (req, res) => {
  const series = await loadSeries(req.params.id);
  S.assertOwner(series, req.user.id);

  const input = S.parseSeriesInput({ ...series, ...req.body });
  if (input.cellId && input.cellId !== series.cellId) {
    await S.assertMayOrganizeForCell(input.cellId, req.user.id);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.prayerRoomSeries.update({
      where: { id: series.id }, data: input, include: S.SERIES_INCLUDE,
    });
    // Future SCHEDULED occurrences are rebuilt from the new rule. Past and
    // in-flight ones are preserved exactly — editing a series must never
    // rewrite what already happened.
    await tx.prayerRoomOccurrence.deleteMany({
      where: { seriesId: series.id, status: 'SCHEDULED', scheduledStartUtc: { gt: new Date() } },
    });
    return next;
  });
  await S.materializeSeries(updated);

  res.json(updated);
}));

router.post('/occurrences/:id/cancel', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  S.assertOwner(occ.series, req.user.id);
  if (occ.status === 'ENDED') throw S.invalid('That session has already finished');

  const reason = req.body.reason ? String(req.body.reason).slice(0, 300) : null;
  const updated = await prisma.prayerRoomOccurrence.update({
    where: { id: occ.id },
    data: { status: 'CANCELED', canceledAt: new Date(), canceledReason: reason },
    include: { series: { include: S.SERIES_INCLUDE } },
  });
  await notifySubscribers(req.app.get('io'), updated, {
    kind: 'CANCELED', type: 'ROOM_CANCELED',
    message: `"${updated.titleOverride || updated.series.title}" was canceled`,
    excludeUserIds: [req.user.id],
  });
  res.json(S.serializeOccurrence(updated));
}));

/** Cancel the whole series. Historical occurrences are kept, not deleted. */
router.post('/series/:id/cancel', authenticate, h(async (req, res) => {
  const series = await loadSeries(req.params.id);
  S.assertOwner(series, req.user.id);

  const future = await prisma.prayerRoomOccurrence.findMany({
    where: { seriesId: series.id, status: 'SCHEDULED', scheduledStartUtc: { gte: new Date() } },
    include: { series: { include: S.SERIES_INCLUDE } },
  });
  await prisma.$transaction([
    prisma.prayerRoomSeries.update({ where: { id: series.id }, data: { status: 'CANCELED' } }),
    prisma.prayerRoomOccurrence.updateMany({
      where: { seriesId: series.id, status: 'SCHEDULED', scheduledStartUtc: { gte: new Date() } },
      data: { status: 'CANCELED', canceledAt: new Date() },
    }),
  ]);

  const io = req.app.get('io');
  for (const occ of future.slice(0, 5)) {
    await notifySubscribers(io, occ, {
      kind: 'CANCELED', type: 'ROOM_CANCELED',
      message: `"${series.title}" was canceled`,
      excludeUserIds: [req.user.id],
    });
  }
  res.json({ ok: true, canceledOccurrences: future.length });
}));

// ---------------------------------------------------------------------------
// Going live
// ---------------------------------------------------------------------------

router.post('/occurrences/:id/start', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertHostOrCohost(occ.series, req.user.id);
  if (occ.status === 'CANCELED') throw S.invalid('That session was canceled');
  if (occ.status === 'ENDED') throw S.invalid('That session has already finished');

  const now = new Date();
  let mediaRoomId = occ.mediaRoomId;
  if (!mediaRoomId && provider.isConfigured()) {
    ({ mediaRoomId } = await provider.createRoom({ occurrenceId: occ.id }));
  }

  // The room opens whether or not audio is available, so the schedule, the
  // linked requests and attendance are all usable ahead of integration; the
  // client renders an explicit "audio unavailable" state from `liveAudio`.
  const updated = await prisma.prayerRoomOccurrence.update({
    where: { id: occ.id },
    data: { status: 'LIVE', actualStartedAt: occ.actualStartedAt || now, hostNoShow: false, mediaRoomId },
    include: { series: { include: S.SERIES_INCLUDE } },
  });

  await notifySubscribers(req.app.get('io'), updated, {
    kind: 'STARTED', type: 'ROOM_STARTED',
    message: `"${updated.titleOverride || updated.series.title}" is live now`,
    excludeUserIds: [req.user.id],
  });

  res.json({
    ...S.serializeOccurrence(updated, { connected: await S.connectedCount(occ.id) }),
    liveAudio: { available: provider.isConfigured(), provider: provider.name },
  });
}));

router.post('/occurrences/:id/end', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertHostOrCohost(occ.series, req.user.id);

  const now = new Date();
  if (occ.mediaRoomId && provider.isConfigured()) {
    await provider.closeRoom({ mediaRoomId: occ.mediaRoomId }).catch(err =>
      console.error(`closeRoom(${occ.mediaRoomId}):`, err.message));
  }
  await prisma.$transaction([
    // Close every still-open interval so nobody accrues time after the end.
    prisma.prayerRoomAttendance.updateMany({
      where: { occurrenceId: occ.id, leftAt: null },
      data: { leftAt: now, closedBy: 'SWEEPER' },
    }),
    prisma.prayerRoomOccurrence.update({
      where: { id: occ.id }, data: { status: 'ENDED', actualEndedAt: now },
    }),
  ]);
  res.json({ ok: true });
}));

/**
 * POST /api/prayer-rooms/occurrences/:id/join
 * Server-side permission check FIRST, then a short-lived, occurrence-scoped,
 * role-bearing media token. Today there is no provider, so this returns 503
 * with a code the client renders honestly. It does NOT write attendance:
 * attendance comes from confirmed media connections, never from this call.
 */
router.post('/occurrences/:id/join', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertCanView(occ.series, req.user.id);
  if (occ.status === 'CANCELED') throw S.invalid('That session was canceled');
  if (occ.status === 'ENDED') throw S.invalid('That session has finished');
  if (occ.status !== 'LIVE') throw S.invalid('That session has not started yet');

  const host = await S.isHostOrCohost(occ.series, req.user.id);
  const role = occ.series.hostId === req.user.id ? 'HOST' : host ? 'COHOST' : 'LISTENER';

  if (!provider.isConfigured() || !occ.mediaRoomId) {
    return res.status(503).json({
      error: 'Live audio is not available yet: no media provider is configured for this deployment.',
      code: 'MEDIA_PROVIDER_NOT_CONFIGURED',
      role,
    });
  }

  const token = await provider.issueToken({
    mediaRoomId: occ.mediaRoomId, userId: req.user.id, role, ttlSeconds: 300,
  });
  res.json({ role, ...token });
}));

// ---------------------------------------------------------------------------
// Subscriptions and reminders
// ---------------------------------------------------------------------------

function parseReminderMinutes(value) {
  const n = Number(value ?? 10);
  if (!Number.isInteger(n) || n < 0 || n > 1440) throw S.invalid('Reminder must be 0-1440 minutes before');
  return n;
}

router.post('/occurrences/:id/subscribe', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertCanView(occ.series, req.user.id);
  const remindMinutesBefore = parseReminderMinutes(req.body.remindMinutesBefore);

  const row = await prisma.prayerRoomSubscription.upsert({
    where: { userId_occurrenceId: { userId: req.user.id, occurrenceId: occ.id } },
    create: { userId: req.user.id, occurrenceId: occ.id, remindMinutesBefore, muted: false },
    update: { remindMinutesBefore, muted: false },
  });
  res.json({ reminderSet: true, remindMinutesBefore: row.remindMinutesBefore });
}));

/**
 * Unsubscribing from a single occurrence you reach through a SERIES
 * subscription cannot just delete a row — there is no row. It writes a muted
 * occurrence row, which is the per-instance opt-out.
 */
router.delete('/occurrences/:id/subscribe', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  const seriesSub = await prisma.prayerRoomSubscription.findUnique({
    where: { userId_seriesId: { userId: req.user.id, seriesId: occ.seriesId } },
    select: { id: true },
  });

  if (seriesSub) {
    await prisma.prayerRoomSubscription.upsert({
      where: { userId_occurrenceId: { userId: req.user.id, occurrenceId: occ.id } },
      create: { userId: req.user.id, occurrenceId: occ.id, muted: true },
      update: { muted: true },
    });
  } else {
    await prisma.prayerRoomSubscription.deleteMany({
      where: { userId: req.user.id, occurrenceId: occ.id },
    });
  }
  res.json({ reminderSet: false });
}));

router.post('/series/:id/subscribe', authenticate, h(async (req, res) => {
  const series = await loadSeries(req.params.id);
  await S.assertCanView(series, req.user.id);
  const remindMinutesBefore = parseReminderMinutes(req.body.remindMinutesBefore);

  await prisma.prayerRoomSubscription.upsert({
    where: { userId_seriesId: { userId: req.user.id, seriesId: series.id } },
    create: { userId: req.user.id, seriesId: series.id, remindMinutesBefore },
    update: { remindMinutesBefore },
  });
  res.json({ seriesSubscribed: true });
}));

/** Opting out of a series clears its per-occurrence mutes too. */
router.delete('/series/:id/subscribe', authenticate, h(async (req, res) => {
  const series = await loadSeries(req.params.id);
  const occIds = await prisma.prayerRoomOccurrence.findMany({
    where: { seriesId: series.id }, select: { id: true },
  });
  await prisma.prayerRoomSubscription.deleteMany({
    where: {
      userId: req.user.id,
      OR: [{ seriesId: series.id }, { occurrenceId: { in: occIds.map(o => o.id) } }],
    },
  });
  res.json({ seriesSubscribed: false });
}));

// ---------------------------------------------------------------------------
// Attendance (host view)
// ---------------------------------------------------------------------------

router.get('/occurrences/:id/attendance', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  // Only the host, a co-host, or a site admin may see who attended.
  const allowed = await S.isHostOrCohost(occ.series, req.user.id);
  if (!allowed) {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isAdmin: true } });
    if (!me?.isAdmin) throw S.forbidden('Only the host can see attendance');
  }
  res.json({ attendance: await S.attendanceSummary(occ.id) });
}));

// ---------------------------------------------------------------------------
// Linked prayer requests
// ---------------------------------------------------------------------------

/**
 * Link an existing request. A PRIVATE request may only be linked by its OWNER,
 * and even then the detail endpoint still gates per viewer — a private request
 * cannot leak through a public room.
 */
router.post('/occurrences/:id/requests', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertHostOrCohost(occ.series, req.user.id);

  const request = await prisma.prayerRequest.findUnique({
    where: { id: String(req.body.prayerRequestId || '') },
    select: { id: true, userId: true, visibility: true, isRemoved: true },
  });
  if (!request || request.isRemoved) throw S.notFound('Prayer request not found');
  if (request.visibility !== 'PUBLIC' && request.userId !== req.user.id) {
    throw S.forbidden('That request is private. Only the person who shared it can bring it into a room.');
  }

  await prisma.prayerRoomLinkedRequest.upsert({
    where: { occurrenceId_prayerRequestId: { occurrenceId: occ.id, prayerRequestId: request.id } },
    create: { occurrenceId: occ.id, prayerRequestId: request.id, linkedById: req.user.id },
    update: {},
  });
  res.status(201).json({ ok: true });
}));

router.delete('/occurrences/:id/requests/:requestId', authenticate, h(async (req, res) => {
  const occ = await loadOccurrence(req.params.id);
  await S.assertHostOrCohost(occ.series, req.user.id);
  await prisma.prayerRoomLinkedRequest.deleteMany({
    where: { occurrenceId: occ.id, prayerRequestId: req.params.requestId },
  });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Co-hosts and invitations
// ---------------------------------------------------------------------------

router.post('/series/:id/roles', authenticate, h(async (req, res) => {
  const series = await loadSeries(req.params.id);
  S.assertOwner(series, req.user.id);

  const role = String(req.body.role || '').toUpperCase();
  if (!['COHOST', 'INVITEE'].includes(role)) throw S.invalid('Role must be COHOST or INVITEE');
  const targetId = String(req.body.userId || '');
  if (!targetId || targetId === req.user.id) throw S.invalid('Pick someone else');

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw S.notFound('User not found');

  await prisma.prayerRoomRole.upsert({
    where: { seriesId_userId: { seriesId: series.id, userId: targetId } },
    create: { seriesId: series.id, userId: targetId, role },
    update: { role },
  });
  res.status(201).json({ ok: true });
}));

router.delete('/series/:id/roles/:userId', authenticate, h(async (req, res) => {
  const series = await loadSeries(req.params.id);
  S.assertOwner(series, req.user.id);
  await prisma.prayerRoomRole.deleteMany({ where: { seriesId: series.id, userId: req.params.userId } });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Provider webhook — attendance truth
// ---------------------------------------------------------------------------

/**
 * Unauthenticated by design: the provider calls this, not a user. The SIGNATURE
 * is the authorization, so an unverifiable delivery is rejected outright —
 * attendance is derived from these events, and an unverified one would be a
 * forged attendance record.
 *
 * Inert today: the null provider's verifyWebhook always returns false.
 */
router.post('/webhooks/media', express.raw({ type: '*/*', limit: '256kb' }), h(async (req, res) => {
  if (!provider.isConfigured() || !provider.verifyWebhook(req.body, req.headers)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed payload' });
  }
  const event = provider.parseWebhookEvent(payload);
  if (!event) return res.json({ ignored: true });

  const occ = await prisma.prayerRoomOccurrence.findFirst({
    where: { mediaRoomId: event.mediaRoomId }, select: { id: true },
  });
  if (!occ) return res.json({ ignored: true });

  // Every branch is idempotent: a duplicate delivery hits the unique key or an
  // already-satisfied filter, and an out-of-order "left" before "joined"
  // cannot close a row that does not exist yet.
  if (event.type === 'participant_joined') {
    await prisma.prayerRoomAttendance.createMany({
      data: [{
        occurrenceId: occ.id, userId: event.userId,
        joinedAt: event.occurredAt, mediaSessionId: event.mediaSessionId,
      }],
      skipDuplicates: true,
    });
  } else if (event.type === 'participant_left') {
    const row = await prisma.prayerRoomAttendance.findUnique({
      where: { occurrenceId_mediaSessionId: { occurrenceId: occ.id, mediaSessionId: event.mediaSessionId } },
      select: { id: true, joinedAt: true, leftAt: true },
    });
    if (row && !row.leftAt) {
      const leftAt = event.occurredAt > row.joinedAt ? event.occurredAt : row.joinedAt;
      await prisma.prayerRoomAttendance.update({
        where: { id: row.id },
        data: {
          leftAt,
          connectedSeconds: Math.floor((leftAt - row.joinedAt) / 1000),
          closedBy: 'MEDIA',
        },
      });
    }
  } else if (event.type === 'room_finished') {
    await prisma.prayerRoomAttendance.updateMany({
      where: { occurrenceId: occ.id, leftAt: null },
      data: { leftAt: event.occurredAt, closedBy: 'MEDIA' },
    });
    await prisma.prayerRoomOccurrence.updateMany({
      where: { id: occ.id, status: 'LIVE' },
      data: { status: 'ENDED', actualEndedAt: event.occurredAt },
    });
  }
  res.json({ ok: true });
}));

module.exports = router;
