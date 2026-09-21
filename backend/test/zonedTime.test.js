// Run with: npm --prefix backend test   (node:test, no dependency)
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isValidTimeZone,
  zonedWallClockToUtc,
  expandOccurrences,
  partsInZone,
} = require('../src/utils/zonedTime');

/** What wall clock does `instant` show in `tz`? "YYYY-MM-DD HH:MM" */
function wallClock(instant, tz) {
  const p = partsInZone(instant.getTime(), tz);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

const HOUR = 3600_000;

test('isValidTimeZone accepts IANA names and rejects junk', () => {
  assert.ok(isValidTimeZone('Europe/London'));
  assert.ok(isValidTimeZone('UTC'));
  assert.ok(isValidTimeZone('Asia/Kolkata'));
  assert.ok(!isValidTimeZone('Mars/Olympus_Mons'));
  assert.ok(!isValidTimeZone('GMT+1')); // not an IANA zone id
  assert.ok(!isValidTimeZone(''));
  assert.ok(!isValidTimeZone(null));
});

test('wall clock converts through a whole-hour offset', () => {
  const utc = zonedWallClockToUtc(
    { year: 2027, month: 1, day: 15, hour: 7, minute: 0 },
    'Europe/London',
  );
  assert.equal(utc.toISOString(), '2027-01-15T07:00:00.000Z'); // GMT in January
});

test('wall clock converts through a half-hour offset', () => {
  const utc = zonedWallClockToUtc(
    { year: 2027, month: 6, day: 1, hour: 7, minute: 0 },
    'Asia/Kolkata',
  );
  assert.equal(utc.toISOString(), '2027-06-01T01:30:00.000Z'); // +05:30, no DST
});

test('a wall clock inside the spring-forward gap resolves after the gap', () => {
  // 02:30 on 2027-03-14 never happens in New York: 02:00 EST jumps to 03:00 EDT.
  const utc = zonedWallClockToUtc(
    { year: 2027, month: 3, day: 14, hour: 2, minute: 30 },
    'America/New_York',
  );
  // Must be a real instant at or after the moment the clocks moved (07:00Z).
  assert.ok(utc.getTime() >= Date.UTC(2027, 2, 14, 7, 0), `got ${utc.toISOString()}`);
  // And it must not silently land on the previous day or skip a day.
  assert.match(wallClock(utc, 'America/New_York'), /^2027-03-14 03:30$/);
});

test('an ambiguous fall-back wall clock resolves to the FIRST occurrence', () => {
  // 01:30 on 2027-11-07 happens twice in New York (once EDT, once EST).
  const utc = zonedWallClockToUtc(
    { year: 2027, month: 11, day: 7, hour: 1, minute: 30 },
    'America/New_York',
  );
  assert.equal(utc.toISOString(), '2027-11-07T05:30:00.000Z'); // 01:30 EDT (-04:00)
  assert.equal(wallClock(utc, 'America/New_York'), '2027-11-07 01:30');
});

// ---------------------------------------------------------------------------
// The invariant that matters: whatever the zone does, EVERY occurrence of a
// recurring series must land on the same local wall clock. This is the test
// that fails if anyone ever "optimises" expansion into `previous + 24h`.
// ---------------------------------------------------------------------------
for (const [zone, startLocalDate] of [
  ['America/New_York', '2027-03-11'], // spring forward Mar 14
  ['America/New_York', '2027-11-04'], // fall back Nov 7
  ['Europe/London', '2027-03-25'],    // BST starts Mar 28
  ['Europe/London', '2027-10-28'],    // BST ends Oct 31
  ['Australia/Sydney', '2027-04-01'], // southern hemisphere, ends Apr 4
  ['Australia/Sydney', '2027-09-30'], // southern hemisphere, starts Oct 3
  ['Asia/Kolkata', '2027-03-11'],     // no DST at all
  ['UTC', '2027-03-11'],
]) {
  test(`daily 07:00 stays 07:00 local across a DST boundary — ${zone} from ${startLocalDate}`, () => {
    const occurrences = expandOccurrences(
      { timeZone: zone, startLocalDate, localTime: '07:00', recurrence: 'DAILY' },
      { limit: 8 },
    );
    assert.equal(occurrences.length, 8);
    for (const occ of occurrences) {
      assert.match(
        wallClock(occ, zone),
        /07:00$/,
        `${occ.toISOString()} rendered as ${wallClock(occ, zone)} in ${zone}`,
      );
    }
    // Consecutive instants are strictly increasing, and exactly one gap in a
    // DST week is 23h or 25h rather than 24h — proof the clock, not a fixed
    // interval, is driving this.
    const gaps = occurrences.slice(1).map((o, i) => o - occurrences[i]);
    assert.ok(gaps.every((g) => g > 0), 'occurrences must be ascending');
    assert.ok(gaps.every((g) => [23 * HOUR, 24 * HOUR, 25 * HOUR].includes(g)), `gaps: ${gaps}`);
  });
}

test('a spring-forward week really does contain a 23-hour gap', () => {
  const occ = expandOccurrences(
    { timeZone: 'America/New_York', startLocalDate: '2027-03-13', localTime: '07:00', recurrence: 'DAILY' },
    { limit: 3 },
  );
  assert.equal(occ[1] - occ[0], 23 * HOUR, 'Mar 13 -> Mar 14 should be 23h');
  assert.equal(occ[2] - occ[1], 24 * HOUR, 'Mar 14 -> Mar 15 should be 24h');
});

test('a fall-back week really does contain a 25-hour gap', () => {
  const occ = expandOccurrences(
    { timeZone: 'America/New_York', startLocalDate: '2027-11-06', localTime: '07:00', recurrence: 'DAILY' },
    { limit: 3 },
  );
  assert.equal(occ[1] - occ[0], 25 * HOUR, 'Nov 6 -> Nov 7 should be 25h');
});

test('NONE yields exactly one occurrence', () => {
  const occ = expandOccurrences(
    { timeZone: 'Europe/London', startLocalDate: '2027-05-04', localTime: '19:30', recurrence: 'NONE' },
    { limit: 10 },
  );
  assert.equal(occ.length, 1);
  assert.equal(wallClock(occ[0], 'Europe/London'), '2027-05-04 19:30');
});

test('WEEKLY fires only on the selected weekdays', () => {
  // 2027-03-11 is a Thursday. Ask for Tue(2) and Thu(4).
  const occ = expandOccurrences(
    {
      timeZone: 'Europe/London',
      startLocalDate: '2027-03-11',
      localTime: '19:00',
      recurrence: 'WEEKLY',
      weekdays: [2, 4],
    },
    { limit: 4 },
  );
  assert.deepEqual(
    occ.map((o) => wallClock(o, 'Europe/London')),
    ['2027-03-11 19:00', '2027-03-16 19:00', '2027-03-18 19:00', '2027-03-23 19:00'],
  );
});

test('WEEKLY with no weekdays is rejected rather than silently looping', () => {
  assert.throws(
    () => expandOccurrences(
      { timeZone: 'UTC', startLocalDate: '2027-03-11', localTime: '07:00', recurrence: 'WEEKLY', weekdays: [] },
      {},
    ),
    /at least one weekday/,
  );
});

test('untilLocalDate is inclusive and stops the series', () => {
  const occ = expandOccurrences(
    {
      timeZone: 'UTC',
      startLocalDate: '2027-03-11',
      localTime: '07:00',
      recurrence: 'DAILY',
      untilLocalDate: '2027-03-13',
    },
    { limit: 50 },
  );
  assert.equal(occ.length, 3);
  assert.equal(wallClock(occ[2], 'UTC'), '2027-03-13 07:00');
});

test('the from/to window filters without shifting the wall clock', () => {
  const occ = expandOccurrences(
    { timeZone: 'America/New_York', startLocalDate: '2027-03-11', localTime: '07:00', recurrence: 'DAILY' },
    { from: new Date('2027-03-14T00:00:00Z'), to: new Date('2027-03-17T00:00:00Z'), limit: 50 },
  );
  assert.deepEqual(
    occ.map((o) => wallClock(o, 'America/New_York')),
    ['2027-03-14 07:00', '2027-03-15 07:00', '2027-03-16 07:00'],
  );
});

test('unknown zone and unknown recurrence are rejected', () => {
  assert.throws(
    () => expandOccurrences({ timeZone: 'Nowhere/Nothing', startLocalDate: '2027-01-01', localTime: '07:00', recurrence: 'DAILY' }, {}),
    /Unknown IANA time zone/,
  );
  assert.throws(
    () => expandOccurrences({ timeZone: 'UTC', startLocalDate: '2027-01-01', localTime: '07:00', recurrence: 'MONTHLY' }, {}),
    /Unknown recurrence/,
  );
});

test('malformed date and time strings are rejected', () => {
  const base = { timeZone: 'UTC', recurrence: 'NONE', localTime: '07:00', startLocalDate: '2027-01-01' };
  assert.throws(() => expandOccurrences({ ...base, startLocalDate: '01/01/2027' }, {}), /YYYY-MM-DD/);
  assert.throws(() => expandOccurrences({ ...base, localTime: '7:00' }, {}), /HH:MM/);
  assert.throws(() => expandOccurrences({ ...base, localTime: '25:00' }, {}), /out of range/);
});
