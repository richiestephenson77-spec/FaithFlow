const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');
const { getBlockedUserIds } = require('../utils/blocks');

// Unified search across people, prayers, churches and confessions.
// GET /api/search?q=&type=  (type: all | people | prayers | churches | confessions)
//
// Bible search is intentionally omitted: the current Bible integration is an
// AI word-lookup only (no local verse index / full-text API), so there is
// nothing to query. See the batch report.
router.get('/', authenticate, async (req, res) => {
  const q = (req.query.q || '').trim();
  const type = req.query.type || 'all';
  if (q.length < 2) return res.json({ people: [], prayers: [], churches: [], confessions: [] });

  const want = t => type === 'all' || type === t;
  const like = { contains: q, mode: 'insensitive' };

  try {
    const blockedIds = await getBlockedUserIds(req.user.id);
    const [people, prayers, churches, confessions] = await Promise.all([
      want('people') ? searchPeople(q, req.user.id, blockedIds) : Promise.resolve([]),
      want('prayers') ? searchPrayers(like, blockedIds) : Promise.resolve([]),
      want('churches') ? searchChurches(like) : Promise.resolve([]),
      want('confessions') ? searchConfessions(like) : Promise.resolve([]),
    ]);
    res.json({ people, prayers, churches, confessions });
  } catch (err) {
    console.error('search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

async function searchPeople(q, meId, blockedIds = []) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { churchName: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ],
      // Exclude self and anyone in a block relationship (either direction)
      id: { notIn: [meId, ...blockedIds] },
    },
    select: {
      id: true, name: true, profilePhoto: true, churchName: true,
      location: true, isVerifiedPastor: true, prayerWarriorBadge: true,
      _count: { select: { followers: true } },
      followers: { where: { followerId: meId }, select: { followerId: true }, take: 1 },
    },
    take: 20,
    orderBy: { name: 'asc' },
  });
  return users.map(u => ({
    id: u.id, name: u.name, profilePhoto: u.profilePhoto, churchName: u.churchName,
    location: u.location, isVerifiedPastor: u.isVerifiedPastor, prayerWarriorBadge: u.prayerWarriorBadge,
    followerCount: u._count.followers,
    isFollowedByMe: u.followers.length > 0,
  }));
}

// Public, active, non-anonymous requests only — never surface PRIVATE/PASTOR_ONLY.
async function searchPrayers(like, blockedIds = []) {
  const rows = await prisma.prayerRequest.findMany({
    where: {
      visibility: 'PUBLIC',
      isActive: true,
      isRemoved: false,
      ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {}),
      OR: [{ title: like }, { body: like }],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
      _count: { select: { sessions: true } },
    },
  });
  return rows.map(r => ({
    id: r.id, title: r.title, body: r.body, category: r.category,
    isAnswered: r.isAnswered, prayerCount: r._count.sessions, user: r.user,
  }));
}

async function searchChurches(like) {
  const rows = await prisma.church.findMany({
    where: { OR: [{ name: like }, { location: like }] },
    include: { _count: { select: { followers: true } } },
    orderBy: { followers: { _count: 'desc' } },
    take: 20,
  });
  return rows.map(c => ({
    id: c.id, name: c.name, location: c.location, logo: c.logo,
    coverPhoto: c.coverPhoto, followerCount: c._count.followers,
  }));
}

// Confessions are anonymous. This queries ONLY the Confession table and never
// joins ConfessionAuthor, so no author identity can be exposed.
async function searchConfessions(like) {
  const rows = await prisma.confession.findMany({
    where: { content: like, isRemoved: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, content: true, category: true, createdAt: true,
      _count: { select: { encouragements: true, comments: true } },
    },
  });
  return rows.map(c => ({
    id: c.id, content: c.content, category: c.category, createdAt: c.createdAt,
    heartCount: c._count.encouragements, commentCount: c._count.comments,
  }));
}

module.exports = router;
