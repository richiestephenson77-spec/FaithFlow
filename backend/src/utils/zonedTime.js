// IANA-correct wall-clock scheduling. No dependency: Node ships full ICU, so
// Intl.DateTimeFormat is the time-zone database.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: a recurring session is a LOCAL WALL
// CLOCK ("every day at 7:00am in Europe/London"), never an interval. Adding
// 24h to the previous occurrence is wrong twice a year — on the DST boundary
// it silently moves the session to 6am or 8am for everyone. Every occurrence
// here is derived by walking the CIVIL CALENDAR one day at a time and
// converting that local date + local time to an instant through the zone's
// offset on that specific date.
//
// Stored shape: series keep { timeZone, localTime, startLocalDate, weekdays };
// occurrences keep a UTC instant. The instant is derived, the wall clock is
// the source of truth.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Intl.DateTimeFormat construction is expensive and we do it per occurrence.
const FORMATTERS = new Map();
function formatterFor(timeZone) {
  let f = FORMATTERS.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    FORMATTERS.set(timeZone, f);
  }
  return f;
}

/** Civil date/time fields observed in `timeZone` at a given instant. */
function partsInZone(instantMs, timeZone) {
  const out = {};
  for (const p of formatterFor(timeZone).formatToParts(new Date(instantMs))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out;
}

/**
 * Milliseconds east of UTC that `timeZone` observes at `instantMs`.
 * Derived by reading the zone's wall clock and treating it as if it were UTC —
 * the difference from the real instant IS the offset.
 */
function zoneOffsetMs(instantMs, timeZone) {
  const p = partsInZone(instantMs, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Intl resolves to whole seconds, so compare against a whole-second instant
  // or sub-second noise shows up as a bogus offset.
  return asIfUtc - Math.floor(instantMs / 1000) * 1000;
}

function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a local wall clock in `timeZone` to the UTC instant it names.
 *
 * Two boundary cases have no single right answer, so the policy is explicit:
 *  - SPRING FORWARD (the wall time never happens, e.g. 02:30 on a US spring
 *    Sunday): returns the instant that local time maps to once the clocks have
 *    moved — the session shifts forward by the length of the gap rather than
 *    silently vanishing.
 *  - FALL BACK (the wall time happens twice): returns the FIRST occurrence.
 */
function zonedWallClockToUtc({ year, month, day, hour = 0, minute = 0 }, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Probe the offset a day either side; a transition is never closer together
  // than that, so one of these two offsets is the correct one.
  const candidates = [
    naive - zoneOffsetMs(naive - MS_PER_DAY, timeZone),
    naive - zoneOffsetMs(naive + MS_PER_DAY, timeZone),
  ];

  const reproduces = (ms) => {
    const p = partsInZone(ms, timeZone);
    return p.year === year && p.month === month && p.day === day
      && p.hour === hour && p.minute === minute;
  };

  const valid = candidates.filter(reproduces);
  if (valid.length > 0) return new Date(Math.min(...valid)); // ambiguous -> first
  return new Date(Math.max(...candidates));                  // gap -> after it
}

/** Day of week (0=Sunday) for a civil date. Pure arithmetic, no zone involved. */
function civilWeekday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Advance a civil date by one calendar day. Never touches instants. */
function nextCivilDay({ year, month, day }) {
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function parseLocalDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!m) throw new Error(`startLocalDate must be YYYY-MM-DD, got: ${value}`);
  return { year: +m[1], month: +m[2], day: +m[3] };
}

function parseLocalTime(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(value));
  if (!m) throw new Error(`localTime must be HH:MM, got: ${value}`);
  const hour = +m[1];
  const minute = +m[2];
  if (hour > 23 || minute > 59) throw new Error(`localTime out of range: ${value}`);
  return { hour, minute };
}

const RECURRENCE_KINDS = new Set(['NONE', 'DAILY', 'WEEKLY']);

/**
 * Expand a series into UTC occurrence instants.
 *
 * @param {object}   series
 * @param {string}   series.timeZone        IANA zone, e.g. "Europe/London"
 * @param {string}   series.startLocalDate  "YYYY-MM-DD" in that zone
 * @param {string}   series.localTime       "HH:MM" wall clock in that zone
 * @param {string}   series.recurrence      NONE | DAILY | WEEKLY
 * @param {number[]} [series.weekdays]      WEEKLY only; 0=Sun..6=Sat
 * @param {string}   [series.untilLocalDate] inclusive last local date
 * @param {Date}     [window.from]          drop occurrences before this instant
 * @param {Date}     [window.to]            stop at this instant
 * @param {number}   [window.limit]         cap the number returned
 * @returns {Date[]} ascending UTC instants
 */
function expandOccurrences(series, window = {}) {
  const { timeZone, recurrence } = series;
  if (!isValidTimeZone(timeZone)) throw new Error(`Unknown IANA time zone: ${timeZone}`);
  if (!RECURRENCE_KINDS.has(recurrence)) throw new Error(`Unknown recurrence: ${recurrence}`);

  const time = parseLocalTime(series.localTime);
  const until = series.untilLocalDate ? parseLocalDate(series.untilLocalDate) : null;
  const limit = window.limit ?? 50;
  const fromMs = window.from ? window.from.getTime() : -Infinity;
  const toMs = window.to ? window.to.getTime() : Infinity;

  let weekdays = null;
  if (recurrence === 'WEEKLY') {
    weekdays = new Set(series.weekdays || []);
    if (weekdays.size === 0) throw new Error('WEEKLY recurrence needs at least one weekday');
  }

  const out = [];
  let civil = parseLocalDate(series.startLocalDate);

  // Walk local calendar days. The guard is a day count, not a time span, so a
  // series far in the past can't spin: callers pass `from` to skip ahead.
  const MAX_DAYS_SCANNED = 366 * 3;
  for (let scanned = 0; scanned < MAX_DAYS_SCANNED && out.length < limit; scanned++) {
    if (until && civilAfter(civil, until)) break;

    const matches = recurrence === 'NONE'
      ? scanned === 0
      : recurrence === 'DAILY'
        ? true
        : weekdays.has(civilWeekday(civil.year, civil.month, civil.day));

    if (matches) {
      const instant = zonedWallClockToUtc({ ...civil, ...time }, timeZone);
      const ms = instant.getTime();
      if (ms > toMs) break;
      if (ms >= fromMs) out.push(instant);
    }

    if (recurrence === 'NONE') break;
    civil = nextCivilDay(civil);
  }

  return out;
}

function civilAfter(a, b) {
  if (a.year !== b.year) return a.year > b.year;
  if (a.month !== b.month) return a.month > b.month;
  return a.day > b.day;
}

/** The civil date "today" is in `timeZone`, for anchoring a scan window. */
function todayInZone(timeZone, now = new Date()) {
  const p = partsInZone(now.getTime(), timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

function formatLocalDate({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

module.exports = {
  isValidTimeZone,
  zoneOffsetMs,
  partsInZone,
  zonedWallClockToUtc,
  expandOccurrences,
  civilWeekday,
  todayInZone,
  formatLocalDate,
  RECURRENCE_KINDS,
};
