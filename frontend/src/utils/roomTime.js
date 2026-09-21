// Presentation helpers for Prayer Rooms.
//
// Every occurrence arrives from the server as a UTC instant. The VIEWER'S OWN
// zone is what these render in — a session scheduled by a host in New York
// shows as 7:00 PM to them and 12:00 AM to a viewer in London, which is the
// whole point of storing the host's wall clock and deriving the instant.
//
// The host's zone is still shown where it disambiguates (session detail), but
// lists are always in local time and say so.

export const VIEWER_TIME_ZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatTime(iso, timeZone = VIEWER_TIME_ZONE) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', timeZone,
  }).format(new Date(iso));
}

/** The stacked date block on an upcoming row: THU / 24 / SEP. */
export function formatDateBlock(iso, timeZone = VIEWER_TIME_ZONE) {
  const d = new Date(iso);
  const part = (opts) =>
    new Intl.DateTimeFormat(undefined, { ...opts, timeZone }).format(d);
  return {
    weekday: part({ weekday: 'short' }).toUpperCase(),
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }).toUpperCase(),
  };
}

/** Civil date key in a zone, for grouping rows under one heading. */
export function dateKey(iso, timeZone = VIEWER_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).format(new Date(iso));
}

/** "Today" / "Tomorrow" / "Thursday" / "24 September". */
export function formatDayLabel(iso, timeZone = VIEWER_TIME_ZONE, now = new Date()) {
  const key = dateKey(iso, timeZone);
  if (key === dateKey(now, timeZone)) return 'Today';
  if (key === dateKey(new Date(now.getTime() + DAY_MS), timeZone)) return 'Tomorrow';
  const d = new Date(iso);
  const withinAWeek = d - now < 6 * DAY_MS && d > now;
  return new Intl.DateTimeFormat(undefined, withinAWeek
    ? { weekday: 'long', timeZone }
    : { day: 'numeric', month: 'long', timeZone }
  ).format(d);
}

/**
 * A bare "HH:MM" wall clock rendered for reading: "06:30" -> "6:30 AM".
 * Used where the HOST's own schedule is what matters (a "morning prayer"
 * series is morning where the host is, whatever the clock says for you).
 */
export function formatWallClock(localTime) {
  const [h, m] = String(localTime || '00:00').split(':').map(Number);
  // Any date works — only the time-of-day formatting is used.
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, h || 0, m || 0));
}

/** True when the series' zone differs from the viewer's, so times need a qualifier. */
export function zoneDiffers(timeZone, viewer = VIEWER_TIME_ZONE) {
  return !!timeZone && timeZone !== viewer;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Weekly on Tue, Thu" / "Every day" / "One-off". */
export function recurrenceLabel(recurrence, weekdays = []) {
  if (recurrence === 'DAILY') return 'Every day';
  if (recurrence === 'WEEKLY') {
    if (weekdays.length === 7) return 'Every day';
    if (weekdays.length === 0) return 'Weekly';
    return `Weekly on ${weekdays.map(d => WEEKDAY_NAMES[d]).join(', ')}`;
  }
  return 'One-off';
}

export function durationLabel(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** Connected duration, for attendance history. Always a real measured value. */
export function connectedLabel(seconds) {
  if (seconds == null) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hour${h === 1 ? '' : 's'}`;
}

/** Audience wording shown next to the host. */
export function audienceLabel(audience, cell) {
  if (audience === 'CELL') return cell ? `${cell.name} · Members only` : 'Cell members only';
  if (audience === 'INVITE') return 'Invite only';
  return 'Everyone welcome';
}

/** Group upcoming occurrences under one heading per local calendar day. */
export function groupByDay(occurrences, timeZone = VIEWER_TIME_ZONE) {
  const groups = new Map();
  for (const occ of occurrences) {
    const key = dateKey(occ.startsAt, timeZone);
    if (!groups.has(key)) groups.set(key, { key, label: formatDayLabel(occ.startsAt, timeZone), items: [] });
    groups.get(key).items.push(occ);
  }
  return [...groups.values()];
}

/** A local "YYYY-MM-DD" / "HH:MM" pair for seeding the create form. */
export function nowLocalParts(timeZone = VIEWER_TIME_ZONE, now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
  }).formatToParts(now).reduce((a, x) => (x.type !== 'literal' ? { ...a, [x.type]: x.value } : a), {});
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
