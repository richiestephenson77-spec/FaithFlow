// Integration tests for the Prayer Rooms domain layer.
//
// These need a REAL Postgres because they exercise unique keys, CHECK
// constraints and NULL-distinctness — the parts of the design the database
// enforces rather than the code. They are skipped unless TEST_DATABASE_URL is
// set, so `npm test` still passes on a machine without one.
//
// To run them:
//   createdb faithflow_test
//   DATABASE_URL=postgresql://localhost/faithflow_test npx prisma db push
//   TEST_DATABASE_URL=postgresql://localhost/faithflow_test npm test
//
// NOTE: point this at a throwaway database. The suite truncates its tables.

const test = require('node:test');
const assert = require('node:assert/strict');

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  test('prayer rooms integration (skipped: set TEST_DATABASE_URL)', { skip: true }, () => {});
  return;
}
process.env.DATABASE_URL = TEST_DB;
process.env.DIRECT_URL = TEST_DB;

const prisma = require('../src/db');
const S = require('../src/services/prayerRoomService');
const { notifyOnce, recipientsFor } = require('../src/services/prayerRoomNotifications');
const { sweepReminders, sweepLifecycle } = require('../src/services/prayerRoomJobs');

const MIN = 60_000;
let seq = 0;
const uid = (p) => `${p}-${process.pid}-${++seq}`;

async function reset() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE prayer_room_notification_log, prayer_room_linked_requests,
             prayer_room_subscriptions, prayer_room_attendance,
             prayer_room_admissions,
             prayer_room_roles, prayer_room_occurrences, prayer_room_series,
             prayer_cell_members, prayer_cells, notifications, prayer_requests, users
    RESTART IDENTITY CASCADE`);
}

async function makeUser(name = 'Someone') {
  const id = uid('u');
  return prisma.user.create({ data: { id, email: `${id}@test.local`, password: 'x', name } });
}

async function makeSeries(host, over = {}) {
  return prisma.prayerRoomSeries.create({
    data: {
      title: 'Test session', hostId: host.id,
      timeZone: 'Europe/London', localTime: '07:00',
      startLocalDate: '2027-03-11', recurrence: 'NONE', durationMinutes: 30,
      ...over,
    },
    include: S.SERIES_INCLUDE,
  });
}

async function makeOccurrence(series, over = {}) {
  return prisma.prayerRoomOccurrence.create({
    data: {
      seriesId: series.id,
      scheduledStartUtc: new Date(Date.now() + 60 * MIN),
      durationMinutes: series.durationMinutes,
      ...over,
    },
  });
}

test.after(async () => { await prisma.$disconnect(); });

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

test('PUBLIC series is visible to a stranger; INVITE and CELL are not', async () => {
  await reset();
  const host = await makeUser('Host');
  const stranger = await makeUser('Stranger');

  const pub = await makeSeries(host, { audience: 'PUBLIC' });
  const inv = await makeSeries(host, { audience: 'INVITE' });

  const cell = await prisma.prayerCell.create({ data: { id: uid('c'), name: 'Upper Room', creatorId: host.id } });
  const cellSeries = await makeSeries(host, { audience: 'CELL', cellId: cell.id });

  assert.equal(await S.canView(pub, stranger.id), true);
  assert.equal(await S.canView(inv, stranger.id), false);
  assert.equal(await S.canView(cellSeries, stranger.id), false);

  // The host always sees their own, whatever the audience.
  assert.equal(await S.canView(inv, host.id), true);
  assert.equal(await S.canView(cellSeries, host.id), true);
});

test('an invitee sees an INVITE series; a cell member sees a CELL series', async () => {
  await reset();
  const host = await makeUser('Host');
  const guest = await makeUser('Guest');
  const member = await makeUser('Member');

  const inv = await makeSeries(host, { audience: 'INVITE' });
  await prisma.prayerRoomRole.create({ data: { seriesId: inv.id, userId: guest.id, role: 'INVITEE' } });
  assert.equal(await S.canView(inv, guest.id), true);

  const cell = await prisma.prayerCell.create({ data: { id: uid('c'), name: 'Cell', creatorId: host.id } });
  await prisma.prayerCellMember.create({ data: { cellId: cell.id, userId: member.id, role: 'member' } });
  const cellSeries = await makeSeries(host, { audience: 'CELL', cellId: cell.id });
  assert.equal(await S.canView(cellSeries, member.id), true);
  assert.equal(await S.canView(cellSeries, guest.id), false);
});

test('visibilityFilter returns the same answer as canView', async () => {
  await reset();
  const host = await makeUser('Host');
  const guest = await makeUser('Guest');
  const pub = await makeSeries(host, { audience: 'PUBLIC', title: 'Public' });
  const inv = await makeSeries(host, { audience: 'INVITE', title: 'Invite' });
  await prisma.prayerRoomRole.create({ data: { seriesId: inv.id, userId: guest.id, role: 'INVITEE' } });
  const hidden = await makeSeries(host, { audience: 'INVITE', title: 'Hidden' });

  const where = await S.visibilityFilter(guest.id);
  const visible = await prisma.prayerRoomSeries.findMany({ where, select: { id: true } });
  const ids = new Set(visible.map(s => s.id));

  assert.ok(ids.has(pub.id), 'public must be listed');
  assert.ok(ids.has(inv.id), 'invited must be listed');
  assert.ok(!ids.has(hidden.id), 'uninvited INVITE must NOT be listed');
});

test('only a cell admin may organize for a cell', async () => {
  await reset();
  const admin = await makeUser('Admin');
  const member = await makeUser('Member');
  const cell = await prisma.prayerCell.create({ data: { id: uid('c'), name: 'Cell', creatorId: admin.id } });
  await prisma.prayerCellMember.create({ data: { cellId: cell.id, userId: admin.id, role: 'admin' } });
  await prisma.prayerCellMember.create({ data: { cellId: cell.id, userId: member.id, role: 'member' } });

  await S.assertMayOrganizeForCell(cell.id, admin.id); // resolves
  await assert.rejects(() => S.assertMayOrganizeForCell(cell.id, member.id), /Only cell admins/);
});

test('co-host may host but not manage; owner may do both', async () => {
  await reset();
  const host = await makeUser('Host');
  const cohost = await makeUser('Cohost');
  const series = await makeSeries(host);
  await prisma.prayerRoomRole.create({ data: { seriesId: series.id, userId: cohost.id, role: 'COHOST' } });

  assert.equal(await S.isHostOrCohost(series, cohost.id), true);
  assert.equal(S.isOwner(series, cohost.id), false);
  assert.equal(S.isOwner(series, host.id), true);
  assert.throws(() => S.assertOwner(series, cohost.id), /Only the host/);
});

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

test('materializing twice does not duplicate occurrences', async () => {
  await reset();
  const host = await makeUser('Host');
  const today = new Date();
  const localToday = today.toISOString().slice(0, 10);
  const series = await makeSeries(host, { recurrence: 'DAILY', startLocalDate: localToday, timeZone: 'UTC' });

  const first = await S.materializeSeries(series);
  assert.ok(first > 0, 'first pass should create occurrences');
  const second = await S.materializeSeries(series);
  assert.equal(second, 0, 'second pass must create nothing');

  const rows = await prisma.prayerRoomOccurrence.findMany({ where: { seriesId: series.id } });
  const instants = rows.map(r => r.scheduledStartUtc.toISOString());
  assert.equal(new Set(instants).size, instants.length, 'no duplicate instants');
});

test('materializing does not resurrect a canceled occurrence', async () => {
  await reset();
  const host = await makeUser('Host');
  const localToday = new Date().toISOString().slice(0, 10);
  const series = await makeSeries(host, { recurrence: 'DAILY', startLocalDate: localToday, timeZone: 'UTC' });
  await S.materializeSeries(series);

  const one = await prisma.prayerRoomOccurrence.findFirst({ where: { seriesId: series.id } });
  await prisma.prayerRoomOccurrence.update({ where: { id: one.id }, data: { status: 'CANCELED' } });

  await S.materializeSeries(series);
  const after = await prisma.prayerRoomOccurrence.findUnique({ where: { id: one.id } });
  assert.equal(after.status, 'CANCELED', 'a re-materialize must not revive a cancellation');
});

test('a CANCELED series materializes nothing', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host, { recurrence: 'DAILY', status: 'CANCELED' });
  assert.equal(await S.materializeSeries(series), 0);
});

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

test('connected time sums separate intervals and merges overlapping ones', () => {
  const t = (m) => new Date(Date.UTC(2027, 0, 1, 12, m));

  // Two clean intervals: 5 min + 3 min.
  assert.equal(
    S.sumConnectedSeconds([
      { joinedAt: t(0), leftAt: t(5) },
      { joinedAt: t(10), leftAt: t(13) },
    ], t(20)),
    8 * 60,
  );

  // Overlapping (a reconnect where both connections briefly coexist) must be
  // merged, not added — otherwise a client could inflate its own total.
  assert.equal(
    S.sumConnectedSeconds([
      { joinedAt: t(0), leftAt: t(10) },
      { joinedAt: t(8), leftAt: t(15) },
    ], t(20)),
    15 * 60,
  );

  // An open interval is measured to now.
  assert.equal(S.sumConnectedSeconds([{ joinedAt: t(0), leftAt: null }], t(7)), 7 * 60);

  // Out-of-order input is handled.
  assert.equal(
    S.sumConnectedSeconds([
      { joinedAt: t(10), leftAt: t(13) },
      { joinedAt: t(0), leftAt: t(5) },
    ], t(20)),
    8 * 60,
  );
});

test('connectedCount counts distinct users with an open interval only', async () => {
  await reset();
  const host = await makeUser('Host');
  const a = await makeUser('A');
  const b = await makeUser('B');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });

  await prisma.prayerRoomAttendance.createMany({
    data: [
      // Two open connections for the SAME user must count once.
      { occurrenceId: occ.id, userId: a.id, joinedAt: new Date(), mediaSessionId: 'c1' },
      { occurrenceId: occ.id, userId: a.id, joinedAt: new Date(), mediaSessionId: 'c2' },
      // A closed interval must not count at all.
      { occurrenceId: occ.id, userId: b.id, joinedAt: new Date(Date.now() - MIN), leftAt: new Date(), mediaSessionId: 'c3' },
    ],
  });
  assert.equal(await S.connectedCount(occ.id), 1);
});

test('a scheduled occurrence never reports a connected count', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'SCHEDULED' });
  const dto = S.serializeOccurrence({ ...occ, series }, { connected: 99 });
  assert.equal(dto.connectedCount, null, 'only a LIVE room may show a number');
});

// ---------------------------------------------------------------------------
// Subscriptions and reminders
// ---------------------------------------------------------------------------

test('a muted occurrence is excluded from a series subscription', async () => {
  await reset();
  const host = await makeUser('Host');
  const sub = await makeUser('Sub');
  const series = await makeSeries(host, { recurrence: 'DAILY' });
  const occ = await makeOccurrence(series);

  await prisma.prayerRoomSubscription.create({ data: { userId: sub.id, seriesId: series.id } });
  assert.deepEqual((await recipientsFor(occ)).map(r => r.userId), [sub.id]);

  await prisma.prayerRoomSubscription.create({ data: { userId: sub.id, occurrenceId: occ.id, muted: true } });
  assert.deepEqual(await recipientsFor(occ), [], 'muting one instance opts out of just that one');
});

test('an occurrence-level lead time overrides the series default', async () => {
  await reset();
  const host = await makeUser('Host');
  const sub = await makeUser('Sub');
  const series = await makeSeries(host, { recurrence: 'DAILY' });
  const occ = await makeOccurrence(series);

  await prisma.prayerRoomSubscription.create({ data: { userId: sub.id, seriesId: series.id, remindMinutesBefore: 10 } });
  await prisma.prayerRoomSubscription.create({ data: { userId: sub.id, occurrenceId: occ.id, remindMinutesBefore: 45 } });

  const [r] = await recipientsFor(occ);
  assert.equal(r.remindMinutesBefore, 45);
});

test('notifyOnce is idempotent per (occurrence, user, kind)', async () => {
  await reset();
  const host = await makeUser('Host');
  const sub = await makeUser('Sub');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series);

  const first = await notifyOnce(null, { occurrenceId: occ.id, userId: sub.id, kind: 'REMINDER', type: 'ROOM_REMINDER', message: 'soon' });
  const second = await notifyOnce(null, { occurrenceId: occ.id, userId: sub.id, kind: 'REMINDER', type: 'ROOM_REMINDER', message: 'soon' });
  assert.equal(first, true);
  assert.equal(second, false, 'a second send must be suppressed');

  assert.equal(await prisma.notification.count({ where: { userId: sub.id } }), 1);

  // A DIFFERENT kind for the same occurrence is still allowed through.
  assert.equal(
    await notifyOnce(null, { occurrenceId: occ.id, userId: sub.id, kind: 'CANCELED', type: 'ROOM_CANCELED', message: 'off' }),
    true,
  );
});

test('the sweeper sends a reminder once it is due, and never twice', async () => {
  await reset();
  const host = await makeUser('Host');
  const sub = await makeUser('Sub');
  const series = await makeSeries(host);
  const start = new Date(Date.now() + 30 * MIN);
  const occ = await makeOccurrence(series, { scheduledStartUtc: start });
  await prisma.prayerRoomSubscription.create({ data: { userId: sub.id, seriesId: series.id, remindMinutesBefore: 10 } });

  // 20 minutes out with a 10-minute lead: not yet due.
  assert.equal(await sweepReminders(null, new Date(start.getTime() - 20 * MIN)), 0);
  // 5 minutes out: due.
  assert.equal(await sweepReminders(null, new Date(start.getTime() - 5 * MIN)), 1);
  // Overlapping / repeated passes must not resend.
  assert.equal(await sweepReminders(null, new Date(start.getTime() - 4 * MIN)), 0);
});

test('the host is not reminded about their own session', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const start = new Date(Date.now() + 10 * MIN);
  await makeOccurrence(series, { scheduledStartUtc: start });
  await prisma.prayerRoomSubscription.create({ data: { userId: host.id, seriesId: series.id, remindMinutesBefore: 30 } });

  assert.equal(await sweepReminders(null, new Date()), 0);
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

test('a live room with nobody connected is ended once its window elapses', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host, { durationMinutes: 30 });
  const started = new Date(Date.now() - 120 * MIN);
  const occ = await makeOccurrence(series, { status: 'LIVE', scheduledStartUtc: started, actualStartedAt: started });

  const out = await sweepLifecycle(new Date());
  assert.equal(out.ended, 1);
  const after = await prisma.prayerRoomOccurrence.findUnique({ where: { id: occ.id } });
  assert.equal(after.status, 'ENDED');
  assert.ok(after.actualEndedAt);
  assert.equal(after.hostNoShow, false, 'it did go live, so this is not a no-show');
});

test('a live room with someone still connected is left alone', async () => {
  await reset();
  const host = await makeUser('Host');
  const a = await makeUser('A');
  const series = await makeSeries(host, { durationMinutes: 30 });
  const started = new Date(Date.now() - 120 * MIN);
  const occ = await makeOccurrence(series, { status: 'LIVE', scheduledStartUtc: started, actualStartedAt: started });
  await prisma.prayerRoomAttendance.create({
    data: { occurrenceId: occ.id, userId: a.id, joinedAt: started, mediaSessionId: 'open' },
  });

  const out = await sweepLifecycle(new Date());
  assert.equal(out.ended, 0, 'a long session is not a stale one');
  assert.equal((await prisma.prayerRoomOccurrence.findUnique({ where: { id: occ.id } })).status, 'LIVE');
});

test('a scheduled occurrence that never went live is recorded as a host no-show', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host, { durationMinutes: 30 });
  const occ = await makeOccurrence(series, { scheduledStartUtc: new Date(Date.now() - 180 * MIN) });

  const out = await sweepLifecycle(new Date());
  assert.equal(out.noShows, 1);
  const after = await prisma.prayerRoomOccurrence.findUnique({ where: { id: occ.id } });
  assert.equal(after.status, 'ENDED');
  assert.equal(after.hostNoShow, true);
});

test('a future occurrence is untouched by the lifecycle sweep', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { scheduledStartUtc: new Date(Date.now() + 120 * MIN) });
  const out = await sweepLifecycle(new Date());
  assert.equal(out.noShows, 0);
  assert.equal((await prisma.prayerRoomOccurrence.findUnique({ where: { id: occ.id } })).status, 'SCHEDULED');
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

test('series input is validated rather than trusted', () => {
  const ok = {
    title: 'Morning prayer', timeZone: 'Europe/London', localTime: '07:00',
    startLocalDate: '2027-03-11', recurrence: 'NONE', durationMinutes: 30,
  };
  assert.equal(S.parseSeriesInput(ok).title, 'Morning prayer');

  assert.throws(() => S.parseSeriesInput({ ...ok, title: 'x' }), /title/i);
  assert.throws(() => S.parseSeriesInput({ ...ok, timeZone: 'Mars/Base' }), /time zone/i);
  assert.throws(() => S.parseSeriesInput({ ...ok, localTime: '7am' }), /HH:MM/);
  assert.throws(() => S.parseSeriesInput({ ...ok, durationMinutes: 4 }), /Duration/);
  assert.throws(() => S.parseSeriesInput({ ...ok, durationMinutes: 10000 }), /Duration/);
  assert.throws(() => S.parseSeriesInput({ ...ok, recurrence: 'WEEKLY', weekdays: [] }), /day of the week/);
  assert.throws(() => S.parseSeriesInput({ ...ok, audience: 'CELL' }), /which cell/);
  assert.throws(() => S.parseSeriesInput({ ...ok, untilLocalDate: '2027-03-01' }), /before the start/);

  // Unknown fields are dropped, not passed through to Prisma.
  const parsed = S.parseSeriesInput({ ...ok, hostId: 'someone-else', status: 'CANCELED', id: 'forged' });
  assert.equal(parsed.hostId, undefined);
  assert.equal(parsed.status, undefined);
  assert.equal(parsed.id, undefined);
});

// ---------------------------------------------------------------------------
// Admission — the 25-person cap
// ---------------------------------------------------------------------------

async function makeUsers(n) {
  const users = [];
  for (let i = 0; i < n; i++) users.push(await makeUser(`Person ${i}`));
  return users;
}

test('the cap admits up to the limit and refuses the next person', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });
  const users = await makeUsers(4);

  for (const u of users.slice(0, 3)) {
    const r = await S.admitToRoom(occ.id, u.id, { max: 3 });
    assert.equal(r.admitted, true);
    assert.equal(r.rejoined, false);
  }
  assert.equal(await S.heldSeats(occ.id), 3);

  await assert.rejects(
    () => S.admitToRoom(occ.id, users[3].id, { max: 3 }),
    (err) => err.code === 'ROOM_FULL' && err.status === 409,
  );
  assert.equal(await S.heldSeats(occ.id), 3, 'a refused join must not take a place');
});

test('a reconnect re-takes the SAME place and is free even in a full room', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });
  const users = await makeUsers(3);

  for (const u of users) await S.admitToRoom(occ.id, u.id, { max: 3 });
  assert.equal(await S.heldSeats(occ.id), 3, 'room is full');

  // The room is full. An existing participant reconnecting must still get in.
  const again = await S.admitToRoom(occ.id, users[0].id, { max: 3 });
  assert.equal(again.admitted, true);
  assert.equal(again.rejoined, true, 'must be reported as a rejoin, not a new place');
  assert.equal(await S.heldSeats(occ.id), 3, 'a reconnect must not consume a second place');

  const rows = await prisma.prayerRoomAdmission.findMany({ where: { occurrenceId: occ.id, userId: users[0].id } });
  assert.equal(rows.length, 1, 'exactly one row per person per room');
});

test('a released place can be re-taken, and by someone else', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });
  const [a, b, c] = await makeUsers(3);

  await S.admitToRoom(occ.id, a.id, { max: 2 });
  await S.admitToRoom(occ.id, b.id, { max: 2 });
  await assert.rejects(() => S.admitToRoom(occ.id, c.id, { max: 2 }), /full/i);

  assert.equal(await S.releaseSeat(occ.id, a.id), 1);
  assert.equal(await S.heldSeats(occ.id), 1);
  // Releasing twice is a no-op, not a double-free that would inflate capacity.
  assert.equal(await S.releaseSeat(occ.id, a.id), 0);

  const r = await S.admitToRoom(occ.id, c.id, { max: 2 });
  assert.equal(r.admitted, true);
  assert.equal(await S.heldSeats(occ.id), 2);

  // The room is full again, so a fourth person is refused.
  const d = await makeUser('D');
  await assert.rejects(() => S.admitToRoom(occ.id, d.id, { max: 2 }), /full/i);
  // But `a`, who left, still owns their old row and can re-enter once there
  // is room — the released row is reused, not duplicated.
  await S.releaseSeat(occ.id, b.id);
  const back = await S.admitToRoom(occ.id, a.id, { max: 2 });
  assert.equal(back.rejoined, true, 'returning to your own released row is a rejoin');
  assert.equal(
    await prisma.prayerRoomAdmission.count({ where: { occurrenceId: occ.id, userId: a.id } }),
    1,
  );
});

// The point of the whole design. Two sequential queries ("count, then insert
// if under the limit") would let every one of these read the same count and
// all insert. This asserts that cannot happen.
test('CONCURRENT joins cannot exceed the cap', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });
  const users = await makeUsers(40);

  const results = await Promise.allSettled(
    users.map(u => S.admitToRoom(occ.id, u.id, { max: 25 })),
  );
  const admitted = results.filter(r => r.status === 'fulfilled').length;
  const refused = results.filter(r => r.status === 'rejected');

  assert.equal(admitted, 25, `expected exactly 25 admitted, got ${admitted}`);
  assert.equal(refused.length, 15);
  assert.ok(refused.every(r => r.reason.code === 'ROOM_FULL'), 'every refusal must be ROOM_FULL');
  assert.equal(await S.heldSeats(occ.id), 25, 'the table must agree with what was returned');
});

test('CONCURRENT reconnects by the same user take exactly one place', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });
  const [u] = await makeUsers(1);

  // A flapping network can fire several joins at once for one person.
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => S.admitToRoom(occ.id, u.id, { max: 25 })),
  );
  assert.ok(results.every(r => r.status === 'fulfilled'), 'no reconnect should be refused');
  assert.equal(await S.heldSeats(occ.id), 1);
  assert.equal(
    await prisma.prayerRoomAdmission.count({ where: { occurrenceId: occ.id, userId: u.id } }),
    1,
  );
});

test('the cap is per room, not global', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occA = await makeOccurrence(series, { status: 'LIVE', scheduledStartUtc: new Date(Date.now() + 5 * MIN) });
  const occB = await makeOccurrence(series, { status: 'LIVE', scheduledStartUtc: new Date(Date.now() + 90 * MIN) });
  const [a, b] = await makeUsers(2);

  await S.admitToRoom(occA.id, a.id, { max: 1 });
  await assert.rejects(() => S.admitToRoom(occA.id, b.id, { max: 1 }), /full/i);
  // A different room has its own places.
  const r = await S.admitToRoom(occB.id, b.id, { max: 1 });
  assert.equal(r.admitted, true);
});

test('the sweeper reclaims a place nobody ever connected on, but not a live one', async () => {
  await reset();
  const host = await makeUser('Host');
  const series = await makeSeries(host);
  const occ = await makeOccurrence(series, { status: 'LIVE' });
  const [ghost, present] = await makeUsers(2);

  await S.admitToRoom(occ.id, ghost.id);
  await S.admitToRoom(occ.id, present.id);
  // `present` actually connected; `ghost` took a token and vanished.
  await prisma.prayerRoomAttendance.create({
    data: { occurrenceId: occ.id, userId: present.id, joinedAt: new Date(), mediaSessionId: 'live-conn' },
  });
  // Age both admissions past the TTL.
  await prisma.prayerRoomAdmission.updateMany({
    where: { occurrenceId: occ.id },
    data: { admittedAt: new Date(Date.now() - 60 * MIN) },
  });

  await sweepLifecycle(new Date());

  const held = await prisma.prayerRoomAdmission.findMany({
    where: { occurrenceId: occ.id, releasedAt: null },
    select: { userId: true },
  });
  assert.deepEqual(held.map(h => h.userId), [present.id],
    'a connected participant must keep their place however long they stay');
});

test('the default cap is 25', () => {
  assert.equal(S.MAX_ROOM_PARTICIPANTS, 25);
});
