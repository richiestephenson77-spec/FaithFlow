const prisma = require('../db');
const { expandOccurrences, isValidTimeZone, todayInZone, formatLocalDate } = require('../utils/zonedTime');

// Prayer Rooms domain logic. Everything that decides WHO MAY DO WHAT lives
// here, so routes stay thin and the same rule cannot drift between endpoints.

const AUDIENCES = new Set(['PUBLIC', 'CELL', 'INVITE']);
const KINDS = new Set(['STANDARD', 'DAILY_PRAYER']);
const RECURRENCES = new Set(['NONE', 'DAILY', 'WEEKLY']);
const OCCURRENCE_STATUSES = new Set(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELED']);

// How far ahead occurrences are materialized, and the most a single series may
// contribute to one listing. Bounded so a decade-long daily series cannot
// generate an unbounded table or dominate Discover.
const MATERIALIZE_DAYS_AHEAD = 60;
const MAX_OCCURRENCES_PER_SERIES = 120;

// A live room is considered abandoned once its scheduled window plus this
// grace period has elapsed with nobody connected.
const STALE_GRACE_MINUTES = 30;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Throws a { status, message } shaped error the routes turn into a response. */
function invalid(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function forbidden(message = 'You do not have access to this session') {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function notFound(message = 'Session not found') {
  const err = new Error(message);
  err.status = 404;
  return err;
}

/**
 * Validate and normalise a series payload. Returns only the fields the caller
 * is allowed to set — never spread raw req.body into Prisma.
 */
function parseSeriesInput(body = {}) {
  const title = String(body.title ?? '').trim();
  if (title.length < 2) throw invalid('Give the session a title');
  if (title.length > 120) throw invalid('Title is too long (120 characters max)');

  const description = body.description == null ? null : String(body.description).trim().slice(0, 2000) || null;

  const timeZone = String(body.timeZone ?? '');
  if (!isValidTimeZone(timeZone)) throw invalid('Pick a valid time zone');

  const localTime = String(body.localTime ?? '');
  if (!/^\d{2}:\d{2}$/.test(localTime)) throw invalid('Time must be HH:MM');

  const startLocalDate = String(body.startLocalDate ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startLocalDate)) throw invalid('Date must be YYYY-MM-DD');

  const untilLocalDate = body.untilLocalDate ? String(body.untilLocalDate) : null;
  if (untilLocalDate && !/^\d{4}-\d{2}-\d{2}$/.test(untilLocalDate)) throw invalid('End date must be YYYY-MM-DD');
  if (untilLocalDate && untilLocalDate < startLocalDate) throw invalid('End date is before the start date');

  const recurrence = String(body.recurrence ?? 'NONE').toUpperCase();
  if (!RECURRENCES.has(recurrence)) throw invalid('Unsupported repeat option');

  let weekdays = [];
  if (recurrence === 'WEEKLY') {
    weekdays = [...new Set((body.weekdays || []).map(Number))].filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
    if (weekdays.length === 0) throw invalid('Choose at least one day of the week');
    weekdays.sort((a, b) => a - b);
  }

  const durationMinutes = Number(body.durationMinutes ?? 30);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
    throw invalid('Duration must be between 5 and 480 minutes');
  }

  const audience = String(body.audience ?? 'PUBLIC').toUpperCase();
  if (!AUDIENCES.has(audience)) throw invalid('Unsupported audience');

  const kind = String(body.kind ?? 'STANDARD').toUpperCase();
  if (!KINDS.has(kind)) throw invalid('Unsupported session kind');

  const cellId = body.cellId ? String(body.cellId) : null;
  if (audience === 'CELL' && !cellId) throw invalid('Choose which cell can join');

  return {
    title, description, timeZone, localTime, startLocalDate, untilLocalDate,
    recurrence, weekdays, durationMinutes, audience, kind, cellId,
  };
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Cell role for a user, or null if not a member. */
async function cellRoleOf(cellId, userId) {
  if (!cellId || !userId) return null;
  const m = await prisma.prayerCellMember.findUnique({
    where: { cellId_userId: { cellId, userId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

/**
 * Only a cell ADMIN may schedule a session in that cell's name. This reuses
 * the cell's existing permission model rather than inventing a second one.
 */
async function assertMayOrganizeForCell(cellId, userId) {
  const role = await cellRoleOf(cellId, userId);
  if (role !== 'admin') throw forbidden('Only cell admins can schedule sessions for a cell');
}

/**
 * Can `userId` SEE this series at all? Restricted metadata must never reach an
 * unauthorized viewer, so listings filter on this too — not just detail reads.
 */
async function canView(series, userId) {
  if (!series) return false;
  if (series.hostId === userId) return true;
  if (series.audience === 'PUBLIC') return true;
  if (series.audience === 'CELL') return (await cellRoleOf(series.cellId, userId)) !== null;
  // INVITE
  const role = await prisma.prayerRoomRole.findUnique({
    where: { seriesId_userId: { seriesId: series.id, userId } },
    select: { role: true },
  });
  return !!role;
}

/** Host or co-host: may start, end, and moderate the room. */
async function isHostOrCohost(series, userId) {
  if (!series || !userId) return false;
  if (series.hostId === userId) return true;
  const role = await prisma.prayerRoomRole.findUnique({
    where: { seriesId_userId: { seriesId: series.id, userId } },
    select: { role: true },
  });
  return role?.role === 'COHOST';
}

/** Owner only: may edit the schedule, cancel, and delete. */
function isOwner(series, userId) {
  return !!series && series.hostId === userId;
}

async function assertCanView(series, userId) {
  if (!(await canView(series, userId))) throw forbidden();
}

async function assertHostOrCohost(series, userId) {
  if (!(await isHostOrCohost(series, userId))) throw forbidden('Only the host can do that');
}

function assertOwner(series, userId) {
  if (!isOwner(series, userId)) throw forbidden('Only the host can do that');
}

/**
 * The Prisma `where` fragment that limits a series listing to what `userId` is
 * entitled to see. Kept as data so list and count queries cannot diverge.
 */
async function visibilityFilter(userId) {
  const [memberships, invites] = await Promise.all([
    prisma.prayerCellMember.findMany({ where: { userId }, select: { cellId: true } }),
    prisma.prayerRoomRole.findMany({ where: { userId }, select: { seriesId: true } }),
  ]);
  return {
    OR: [
      { audience: 'PUBLIC' },
      { hostId: userId },
      { audience: 'CELL', cellId: { in: memberships.map(m => m.cellId) } },
      { id: { in: invites.map(r => r.seriesId) } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

/**
 * Ensure a series' occurrences exist for the forward window.
 *
 * Idempotent by construction: instants come from the wall-clock expander, and
 * the unique key (seriesId, scheduledStartUtc) plus skipDuplicates means two
 * concurrent callers cannot double-write. Occurrences already in the table are
 * left alone, so a cancellation or per-occurrence override is never clobbered.
 */
async function materializeSeries(series, { daysAhead = MATERIALIZE_DAYS_AHEAD } = {}) {
  if (series.status !== 'ACTIVE') return 0;

  const now = new Date();
  const to = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Start the scan from whichever is later: the series' own start, or today in
  // the host's zone. Without this a years-old daily series would re-scan from
  // its first date on every read.
  const todayLocal = formatLocalDate(todayInZone(series.timeZone, now));
  const scanFrom = series.startLocalDate > todayLocal ? series.startLocalDate : todayLocal;

  let instants;
  try {
    instants = expandOccurrences(
      {
        timeZone: series.timeZone,
        startLocalDate: scanFrom,
        localTime: series.localTime,
        recurrence: series.recurrence,
        weekdays: series.weekdays,
        untilLocalDate: series.untilLocalDate,
      },
      // Include occurrences that started recently so a session that is live
      // right now still materializes for a first-time viewer.
      { from: new Date(now.getTime() - 6 * 60 * 60 * 1000), to, limit: MAX_OCCURRENCES_PER_SERIES },
    );
  } catch (err) {
    console.error(`materializeSeries(${series.id}) expansion failed:`, err.message);
    return 0;
  }

  if (instants.length === 0) return 0;

  const res = await prisma.prayerRoomOccurrence.createMany({
    data: instants.map(scheduledStartUtc => ({
      seriesId: series.id,
      scheduledStartUtc,
      durationMinutes: series.durationMinutes,
    })),
    skipDuplicates: true,
  });
  return res.count;
}

/** Materialize a batch of series, tolerating individual failures. */
async function materializeMany(seriesList) {
  await Promise.all(seriesList.map(s => materializeSeries(s).catch(err => {
    console.error(`materializeSeries(${s.id}):`, err.message);
  })));
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

/**
 * Sum the CONNECTED intervals for one user in one occurrence.
 *
 * Overlapping intervals are merged rather than added, so a client that briefly
 * holds two connections during a reconnect cannot inflate its own total. Open
 * intervals are measured to `now`.
 */
function sumConnectedSeconds(intervals, now = new Date()) {
  const spans = intervals
    .map(i => [new Date(i.joinedAt).getTime(), new Date(i.leftAt ?? now).getTime()])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let cursor = -Infinity;
  for (const [start, end] of spans) {
    const from = Math.max(start, cursor);
    if (end > from) {
      total += end - from;
      cursor = end;
    }
  }
  return Math.floor(total / 1000);
}

/** Distinct users with an OPEN interval — the only honest "connected now". */
async function connectedCount(occurrenceId) {
  const rows = await prisma.prayerRoomAttendance.findMany({
    where: { occurrenceId, leftAt: null },
    select: { userId: true },
    distinct: ['userId'],
  });
  return rows.length;
}

/** Per-user connected totals for an occurrence, for the host's attendance view. */
async function attendanceSummary(occurrenceId, now = new Date()) {
  const rows = await prisma.prayerRoomAttendance.findMany({
    where: { occurrenceId },
    select: {
      userId: true, joinedAt: true, leftAt: true,
      user: { select: { id: true, name: true, profilePhoto: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });
  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, { user: r.user, intervals: [] });
    byUser.get(r.userId).intervals.push(r);
  }
  return [...byUser.values()]
    .map(({ user, intervals }) => ({
      user,
      connectedSeconds: sumConnectedSeconds(intervals, now),
      firstJoinedAt: intervals[0].joinedAt,
      stillConnected: intervals.some(i => i.leftAt == null),
    }))
    .sort((a, b) => b.connectedSeconds - a.connectedSeconds);
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Shape an occurrence for the client.
 *
 * `connectedCount` is passed in and only ever set for a LIVE occurrence — a
 * scheduled room has no attendance and must not display a number, and the
 * cumulative total of a past room is not a live count.
 */
function serializeOccurrence(occ, { series, connected = null, viewerState = {} } = {}) {
  const s = series || occ.series;
  return {
    id: occ.id,
    seriesId: s.id,
    title: occ.titleOverride || s.title,
    description: occ.descriptionOverride ?? s.description,
    startsAt: occ.scheduledStartUtc,
    durationMinutes: occ.durationMinutes,
    status: occ.status,
    actualStartedAt: occ.actualStartedAt,
    actualEndedAt: occ.actualEndedAt,
    rescheduledFromUtc: occ.rescheduledFromUtc,
    canceledReason: occ.canceledReason,
    hostNoShow: occ.hostNoShow,
    // Scheduling context, so the client can render "Weekly · 7:00 PM" without
    // re-deriving the rule.
    timeZone: s.timeZone,
    localTime: s.localTime,
    recurrence: s.recurrence,
    weekdays: s.weekdays,
    kind: s.kind,
    audience: s.audience,
    host: s.host ? { id: s.host.id, name: s.host.name, profilePhoto: s.host.profilePhoto } : null,
    cell: s.cell ? { id: s.cell.id, name: s.cell.name } : null,
    // Only ever a real number on a live room; null otherwise.
    connectedCount: occ.status === 'LIVE' ? connected : null,
    ...viewerState,
  };
}

const SERIES_INCLUDE = {
  host: { select: { id: true, name: true, profilePhoto: true } },
  cell: { select: { id: true, name: true } },
};

module.exports = {
  AUDIENCES, KINDS, RECURRENCES, OCCURRENCE_STATUSES,
  MATERIALIZE_DAYS_AHEAD, MAX_OCCURRENCES_PER_SERIES, STALE_GRACE_MINUTES,
  SERIES_INCLUDE,
  invalid, forbidden, notFound,
  parseSeriesInput,
  cellRoleOf, assertMayOrganizeForCell,
  canView, assertCanView, isHostOrCohost, assertHostOrCohost, isOwner, assertOwner,
  visibilityFilter,
  materializeSeries, materializeMany,
  sumConnectedSeconds, connectedCount, attendanceSummary,
  serializeOccurrence,
};
