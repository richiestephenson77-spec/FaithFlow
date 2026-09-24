// Authorization tests for the profile endpoint.
//
// These exist because the profile endpoint was, until this change, sending
// every owner-only prayer metric and every hidden prayer request to any
// authenticated visitor — the client was merely filtering them out for
// display. That is the exact failure mode these assertions are here to stop
// coming back, so they check the PAYLOAD, not the rendering.
//
// Skipped unless TEST_DATABASE_URL is set; see prayerRooms.test.js for setup.

const test = require('node:test');
const assert = require('node:assert/strict');

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  test('profile authorization (skipped: set TEST_DATABASE_URL)', { skip: true }, () => {});
  return;
}
process.env.DATABASE_URL = TEST_DB;
process.env.DIRECT_URL = TEST_DB;

const prisma = require('../src/db');
const { getProfile } = require('../src/controllers/userController');
const { getUserPosts } = require('../src/controllers/postController');

// Minimal Express req/res doubles — enough to capture what would be sent.
function callController(fn, { params, userId }) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    fn({ params, user: userId ? { id: userId } : null, query: {} }, res).catch(reject);
  });
}

let seq = 0;
const uid = (p) => `${p}-${process.pid}-${++seq}`;

async function reset() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE prayer_sessions, prayer_requests, posts, follows, blocks, users
    RESTART IDENTITY CASCADE`);
}

/** An owner with one request of every visibility flavour, plus posts. */
async function seedOwner() {
  const owner = await prisma.user.create({
    data: {
      id: uid('owner'), email: `${uid('o')}@t.local`, password: 'x', name: 'Ruth',
      prayerStreak: 2, longestPrayerStreak: 9, totalPeoplesPrayedFor: 17,
      prayerWarriorBadge: true, dailyPrayerQuota: 5,
    },
  });
  const visitor = await prisma.user.create({
    data: { id: uid('vis'), email: `${uid('v')}@t.local`, password: 'x', name: 'Sam' },
  });
  await prisma.prayerRequest.createMany({
    data: [
      { id: uid('rq'), userId: owner.id, title: 'Public', body: 'b', visibility: 'PUBLIC' },
      { id: uid('rq'), userId: owner.id, title: 'Private', body: 'b', visibility: 'PRIVATE' },
      { id: uid('rq'), userId: owner.id, title: 'Anonymous', body: 'b', visibility: 'PUBLIC', isAnonymous: true },
      { id: uid('rq'), userId: owner.id, title: 'Removed', body: 'b', visibility: 'PUBLIC', isRemoved: true },
    ],
  });
  await prisma.post.createMany({
    data: [
      { id: uid('po'), userId: owner.id, content: 'Visible post' },
      { id: uid('po'), userId: owner.id, content: 'Archived post', isArchived: true },
    ],
  });
  return { owner, visitor };
}

const PRIVATE_USER_FIELDS = [
  'prayerStreak', 'longestPrayerStreak', 'totalPeoplesPrayedFor',
  'prayerWarriorBadge', 'prayerWarriorEarnedAt', 'dailyPrayerQuota',
  'autoDownloadMedia', 'gender', 'isAdmin',
];

test.after(async () => { await prisma.$disconnect(); });

test('a visitor receives NO owner-only prayer metrics', async () => {
  await reset();
  const { owner, visitor } = await seedOwner();
  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: visitor.id });

  for (const f of PRIVATE_USER_FIELDS) {
    assert.ok(!(f in body), `"${f}" must not be sent to a visitor`);
  }
  assert.ok(!('stats' in body), 'the prayer journey must not be computed for a visitor');
  assert.equal(body.isOwner, false);
  // Identity still works.
  assert.equal(body.name, 'Ruth');
});

test('the owner still receives their whole prayer journey', async () => {
  await reset();
  const { owner } = await seedOwner();
  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: owner.id });

  for (const f of PRIVATE_USER_FIELDS) {
    assert.ok(f in body, `owner must still receive "${f}"`);
  }
  assert.ok(body.stats, 'owner must receive stats');
  assert.equal(body.isOwner, true);
  assert.equal(body.prayerStreak, 2);
  assert.equal(body.stats.longestStreak, 9);
});

test('a visitor never sees private, anonymous or removed requests', async () => {
  await reset();
  const { owner, visitor } = await seedOwner();
  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: visitor.id });

  const titles = body.prayerRequests.map(r => r.title);
  assert.deepEqual(titles, ['Public']);
  assert.ok(!titles.includes('Private'), 'private request leaked');
  // The one that matters most: listing an anonymous request under its author's
  // name is what "anonymous" exists to prevent.
  assert.ok(!titles.includes('Anonymous'), 'anonymous request was deanonymized by the profile listing');
  assert.ok(!titles.includes('Removed'), 'moderated request leaked');
  assert.ok(body.prayerRequests.every(r => r.isAnonymous === false));
});

test('the author sees their own private and anonymous requests, but not removed ones', async () => {
  await reset();
  const { owner } = await seedOwner();
  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: owner.id });

  const titles = body.prayerRequests.map(r => r.title).sort();
  assert.deepEqual(titles, ['Anonymous', 'Private', 'Public']);
  assert.ok(!titles.includes('Removed'), 'a moderated request should not reappear on the author profile');
});

test('counts match what the viewer can actually see', async () => {
  await reset();
  const { owner, visitor } = await seedOwner();

  const asVisitor = (await callController(getProfile, { params: { id: owner.id }, userId: visitor.id })).body;
  const asOwner = (await callController(getProfile, { params: { id: owner.id }, userId: owner.id })).body;

  // A count that disagrees with the list is itself a leak — it tells a visitor
  // how much is being kept from them.
  assert.equal(asVisitor._count.prayerRequests, asVisitor.prayerRequests.length);
  assert.equal(asVisitor._count.prayerRequests, 1);
  assert.equal(asOwner._count.prayerRequests, 3);

  assert.equal(asVisitor._count.posts, 1, 'archived post must not be counted for a visitor');
  assert.equal(asOwner._count.posts, 2);
});

test('archived posts are hidden from visitors and kept for the author', async () => {
  await reset();
  const { owner, visitor } = await seedOwner();

  const visitorPosts = (await callController(getUserPosts, { params: { userId: owner.id }, userId: visitor.id })).body;
  const ownerPosts = (await callController(getUserPosts, { params: { userId: owner.id }, userId: owner.id })).body;

  assert.deepEqual(visitorPosts.map(p => p.content), ['Visible post']);
  assert.equal(ownerPosts.length, 2);
});

test('Believers is the FOLLOWER count, one-directional', async () => {
  await reset();
  const { owner, visitor } = await seedOwner();
  const third = await prisma.user.create({
    data: { id: uid('u3'), email: `${uid('u')}@t.local`, password: 'x', name: 'Third' },
  });

  // visitor -> owner (owner gains a follower). owner -> third (owner follows).
  await prisma.follow.create({ data: { followerId: visitor.id, followingId: owner.id } });
  await prisma.follow.create({ data: { followerId: owner.id, followingId: third.id } });

  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: visitor.id });
  assert.equal(body._count.followers, 1, 'followers = people who follow this user');
  assert.equal(body._count.following, 1, 'following = people this user follows');
  // Not mutual-connection semantics: these are counted separately and a
  // one-way follow still counts.
});

test('a blocked visitor gets the unavailable shell and no content', async () => {
  await reset();
  const { owner, visitor } = await seedOwner();
  await prisma.block.create({ data: { blockerId: owner.id, blockedId: visitor.id } });

  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: visitor.id });
  assert.equal(body.unavailable, true);
  assert.ok(!body.prayerRequests, 'no requests for a blocked viewer');
  assert.ok(!body.stats, 'no metrics for a blocked viewer');
  for (const f of PRIVATE_USER_FIELDS) assert.ok(!(f in body), `"${f}" leaked to a blocked viewer`);
});

test('the prayed-for stat is keyed as distinct REQUESTS, not people', async () => {
  await reset();
  const { owner } = await seedOwner();
  const requests = await prisma.prayerRequest.findMany({ where: { userId: owner.id }, select: { id: true } });

  // Two sessions on the SAME request, one on another. Distinct requests = 2.
  await prisma.prayerSession.createMany({
    data: [
      { userId: owner.id, prayerRequestId: requests[0].id, durationSeconds: 60 },
      { userId: owner.id, prayerRequestId: requests[0].id, durationSeconds: 60 },
      { userId: owner.id, prayerRequestId: requests[1].id, durationSeconds: 60 },
    ],
  });

  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: owner.id });
  assert.equal(body.stats.distinctRequestsPrayedFor, 2);
  assert.equal(body.stats.totalSessions, 3, 'sessions and distinct requests are different numbers');
  // The old key claimed to be people and was never computed that way.
  assert.ok(!('totalPeoplePrayedFor' in body.stats), 'the misleading key must be gone');
});

// ---------------------------------------------------------------------------
// Church / location visibility
// ---------------------------------------------------------------------------

test('absence of a visibility row means visible — existing users are unaffected', async () => {
  await reset();
  const owner = await prisma.user.create({
    data: { id: uid('o'), email: `${uid('e')}@t.local`, password: 'x', name: 'Ruth', churchName: 'Grace Chapel', location: 'Hyderabad' },
  });
  const visitor = await prisma.user.create({
    data: { id: uid('v'), email: `${uid('e')}@t.local`, password: 'x', name: 'Sam' },
  });

  // No user_profile_visibility row exists at all.
  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: visitor.id });
  assert.equal(body.churchName, 'Grace Chapel');
  assert.equal(body.location, 'Hyderabad');
});

test('hidden church/location are REMOVED from a visitor payload, not just flagged', async () => {
  await reset();
  const owner = await prisma.user.create({
    data: { id: uid('o'), email: `${uid('e')}@t.local`, password: 'x', name: 'Ruth', churchName: 'Grace Chapel', location: 'Hyderabad' },
  });
  const visitor = await prisma.user.create({
    data: { id: uid('v'), email: `${uid('e')}@t.local`, password: 'x', name: 'Sam' },
  });
  await prisma.userProfileVisibility.create({
    data: { userId: owner.id, showChurch: false, showLocation: false },
  });

  const asVisitor = (await callController(getProfile, { params: { id: owner.id }, userId: visitor.id })).body;
  assert.ok(!('churchName' in asVisitor), 'hidden church must not be on the wire');
  assert.ok(!('location' in asVisitor), 'hidden location must not be on the wire');
  assert.ok(!('profileVisibility' in asVisitor), 'switch positions are the owner’s business');
  // Identity still works.
  assert.equal(asVisitor.name, 'Ruth');

  // The owner keeps both, plus the switch positions so the editor is accurate.
  const asOwner = (await callController(getProfile, { params: { id: owner.id }, userId: owner.id })).body;
  assert.equal(asOwner.churchName, 'Grace Chapel');
  assert.equal(asOwner.location, 'Hyderabad');
  assert.deepEqual(asOwner.profileVisibility, { showChurch: false, showLocation: false });
});

test('hiding one field does not hide the other', async () => {
  await reset();
  const owner = await prisma.user.create({
    data: { id: uid('o'), email: `${uid('e')}@t.local`, password: 'x', name: 'Ruth', churchName: 'Grace Chapel', location: 'Hyderabad' },
  });
  const visitor = await prisma.user.create({
    data: { id: uid('v'), email: `${uid('e')}@t.local`, password: 'x', name: 'Sam' },
  });
  await prisma.userProfileVisibility.create({
    data: { userId: owner.id, showChurch: false, showLocation: true },
  });

  const { body } = await callController(getProfile, { params: { id: owner.id }, userId: visitor.id });
  assert.ok(!('churchName' in body));
  assert.equal(body.location, 'Hyderabad');
});
