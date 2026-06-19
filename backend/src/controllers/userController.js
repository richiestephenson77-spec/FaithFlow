
const prisma = require('../db');

async function getProfile(req, res) {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, bio: true, churchName: true,
        location: true, profilePhoto: true, coverPhoto: true, createdAt: true,
        prayerStreak: true, longestPrayerStreak: true,
        prayerWarriorBadge: true, totalPeoplesPrayedFor: true, prayerWarriorEarnedAt: true, dailyPrayerQuota: true,
        _count: { select: { followers: true, following: true, prayerRequests: true, posts: true } },
        prayerRequests: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sessions = await prisma.prayerSession.aggregate({
      where: { userId: id, durationSeconds: { not: null } },
      _sum: { durationSeconds: true },
      _avg: { durationSeconds: true },
    });

    const uniquePrayedFor = await prisma.prayerSession.findMany({
      where: { userId: id },
      distinct: ['prayerRequestId'],
      select: { prayerRequestId: true },
    });

    const totalSessions = await prisma.prayerSession.count({ where: { userId: id, durationSeconds: { gt: 0 } } });
    const todaySeconds = await getTodayPrayerTime(id);

    const isFollowing = req.user
      ? !!(await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.user.id, followingId: id } },
        }))
      : false;

    res.json({
      ...user,
      stats: {
        totalPeoplePrayedFor: uniquePrayedFor.length,
        totalPrayerSeconds: sessions._sum.durationSeconds || 0,
        avgSessionSeconds: Math.round(sessions._avg.durationSeconds || 0),
        totalSessions,
        streak: user.prayerStreak,
        longestStreak: user.longestPrayerStreak,
        todaySeconds,
      },
      isFollowing,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

async function getMe(req, res) {
  req.params.id = req.user.id;
  getProfile(req, res);
}

async function updateProfile(req, res) {
  const { name, bio, churchName, location } = req.body;
  const profilePhoto = req.files?.profilePhoto?.[0]?.path || undefined;
  const coverPhoto = req.files?.coverPhoto?.[0]?.path || undefined;

  try {
    const data = { name, bio, churchName, location };
    if (profilePhoto) data.profilePhoto = profilePhoto;
    if (coverPhoto) data.coverPhoto = coverPhoto;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true, name: true, bio: true, churchName: true,
        location: true, profilePhoto: true, coverPhoto: true, email: true,
      },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

async function follow(req, res) {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

  try {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: id } },
    });

    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: req.user.id, followingId: id } },
      });
      return res.json({ following: false });
    }

    await prisma.follow.create({ data: { followerId: req.user.id, followingId: id } });

    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });

    // Deduplicate: only create notification if no unread NEW_FOLLOWER from this user exists
    const existingNotif = await prisma.notification.findFirst({
      where: { userId: id, type: 'NEW_FOLLOWER', fromUser: req.user.id, isRead: false },
    });
    if (!existingNotif) {
      await prisma.notification.create({
        data: {
          userId: id,
          type: 'NEW_FOLLOWER',
          message: `${me.name} started following you`,
          fromUser: req.user.id,
        },
      });
    }

    const io = req.app.get('io');
    const { notifyUser } = require('../services/socketService');
    notifyUser(io, id, 'notification', { type: 'NEW_FOLLOWER', fromUser: req.user.id, message: `${me.name} started following you` });

    res.json({ following: true });
  } catch {
    res.status(500).json({ error: 'Failed to follow/unfollow' });
  }
}

async function getFollowers(req, res) {
  const { id } = req.params;
  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: id },
      include: { follower: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(follows.map((f) => f.follower));
  } catch {
    res.status(500).json({ error: 'Failed to get followers' });
  }
}

async function getFollowing(req, res) {
  const { id } = req.params;
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: id },
      include: { following: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(follows.map((f) => f.following));
  } catch {
    res.status(500).json({ error: 'Failed to get following' });
  }
}

async function getDashboard(req, res) {
  const id = req.user.id;
  try {
    const [sessions, uniquePrayedFor, totalSessions, user] = await Promise.all([
      prisma.prayerSession.aggregate({
        where: { userId: id, durationSeconds: { not: null } },
        _sum: { durationSeconds: true },
        _avg: { durationSeconds: true },
      }),
      prisma.prayerSession.findMany({ where: { userId: id }, distinct: ['prayerRequestId'] }),
      prisma.prayerSession.count({ where: { userId: id, durationSeconds: { gt: 0 } } }),
      prisma.user.findUnique({ where: { id }, select: { prayerStreak: true, longestPrayerStreak: true } }),
    ]);

    const todaySeconds = await getTodayPrayerTime(id);

    res.json({
      totalPeoplePrayedFor: uniquePrayedFor.length,
      totalPrayerSeconds: sessions._sum.durationSeconds || 0,
      avgSessionSeconds: Math.round(sessions._avg.durationSeconds || 0),
      totalSessions,
      streak: user.prayerStreak,
      longestStreak: user.longestPrayerStreak,
      todaySeconds,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
}

async function getPrayerStreak(userId) {
  const sessions = await prisma.prayerSession.findMany({
    where: { userId, durationSeconds: { gt: 0 } },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });

  if (!sessions.length) return 0;

  const days = new Set(sessions.map((s) => s.startedAt.toISOString().split('T')[0]));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toISOString().split('T')[0])) streak++;
    else if (i > 0) break;
  }

  return streak;
}

async function getTodayPrayerTime(userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const result = await prisma.prayerSession.aggregate({
    where: { userId, startedAt: { gte: start }, durationSeconds: { not: null } },
    _sum: { durationSeconds: true },
  });
  return result._sum.durationSeconds || 0;
}

async function searchUsers(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { churchName: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
        ],
        NOT: { id: req.user.id },
      },
      select: {
        id: true, name: true, profilePhoto: true, churchName: true,
        location: true, isVerifiedPastor: true, prayerWarriorBadge: true,
        _count: { select: { followers: true } },
        followers: { where: { followerId: req.user.id }, select: { followerId: true }, take: 1 },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
    res.json(users.map(u => ({
      ...u,
      followerCount: u._count.followers,
      isFollowedByMe: u.followers.length > 0,
      followers: undefined,
      _count: undefined,
    })));
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
}

async function getSuggestedUsers(req, res) {
  const { filter } = req.query;
  const me = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { churchName: true, location: true },
  });

  const where = { NOT: { id: req.user.id } };
  if (filter === 'church' && me?.churchName) where.churchName = me.churchName;
  if (filter === 'city' && me?.location) where.location = me.location;
  if (filter === 'warriors') where.prayerWarriorBadge = true;
  if (filter === 'pastors') where.isVerifiedPastor = true;

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, profilePhoto: true, churchName: true,
        location: true, isVerifiedPastor: true, prayerWarriorBadge: true,
        _count: { select: { followers: true } },
        followers: { where: { followerId: req.user.id }, select: { followerId: true }, take: 1 },
      },
      orderBy: [{ profilePhoto: { sort: 'desc', nulls: 'last' } }, { followers: { _count: 'desc' } }],
      take: 10,
    });
    res.json(users.map(u => ({
      ...u,
      followerCount: u._count.followers,
      isFollowedByMe: u.followers.length > 0,
      followers: undefined,
      _count: undefined,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get suggested users' });
  }
}

module.exports = { getProfile, getMe, updateProfile, follow, getFollowers, getFollowing, getDashboard, searchUsers, getSuggestedUsers };
