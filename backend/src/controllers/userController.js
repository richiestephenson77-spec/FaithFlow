
const prisma = require('../db');

// Fields anyone may see on a profile. Identity, nothing more.
const PUBLIC_PROFILE_SELECT = {
  id: true, name: true, bio: true, churchName: true,
  location: true, profilePhoto: true, coverPhoto: true, createdAt: true,
};

// Everything below is the OWNER'S OWN and must never reach another account.
// The private prayer journey (streaks, totals, badge, quota) is personal
// devotional data, not a public score; `gender` exists for prayer-partner
// matching and is edited only by its owner; `isAdmin` and `autoDownloadMedia`
// are account state a visitor has no business reading.
//
// These are gated by SELECTION, not by hiding them later — a visitor's read
// never loads them from the database at all, so there is no path by which a
// refactor could accidentally serialize them.
const OWNER_PROFILE_SELECT = {
  ...PUBLIC_PROFILE_SELECT,
  gender: true,
  isAdmin: true,
  autoDownloadMedia: true,
  prayerStreak: true,
  longestPrayerStreak: true,
  prayerWarriorBadge: true,
  totalPeoplesPrayedFor: true,
  prayerWarriorEarnedAt: true,
  dailyPrayerQuota: true,
};

/**
 * Which of this user's prayer requests the viewer is entitled to see ON THIS
 * PROFILE.
 *
 * A profile listing ATTRIBUTES every request it shows to the named account, so
 * the rules here are deliberately stricter than the prayer feed's:
 *
 *   - Anonymous requests are excluded for everyone except the author. Listing
 *     one under someone's name is precisely what "anonymous" was chosen to
 *     prevent, whatever its visibility setting says.
 *   - Only PUBLIC requests are listed to others. Pastor access to PRIVATE /
 *     PASTOR_ONLY requests exists in the prayer feed and the pastor tools,
 *     where it is a care relationship; extending it to a profile listing
 *     would widen exposure, which is the wrong direction for this.
 *   - Removed (moderated) requests are excluded from everyone's listing.
 *
 * The author still sees all of their own, labelled with their visibility.
 */
function profileRequestWhere(ownerId, isOwner) {
  const base = { userId: ownerId, isActive: true, isRemoved: false };
  if (isOwner) return base;
  return { ...base, visibility: 'PUBLIC', isAnonymous: false };
}

async function getProfile(req, res) {
  const { id } = req.params;
  const viewerId = req.user?.id || null;
  const isOwner = !!viewerId && viewerId === id;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: isOwner ? OWNER_PROFILE_SELECT : PUBLIC_PROFILE_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Moderation: a block in either direction makes the profile unavailable.
    // Surface isBlockedByMe so the viewer can Unblock; never leak their content.
    // One query for both directions (was two parallel lookups).
    if (viewerId && !isOwner) {
      const blocks = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: id },
            { blockerId: id, blockedId: viewerId },
          ],
        },
        select: { blockerId: true },
      });
      if (blocks.length) {
        const iBlockedThem = blocks.some(b => b.blockerId === viewerId);
        return res.json({ id, unavailable: true, isBlockedByMe: iBlockedThem, name: iBlockedThem ? user.name : null });
      }
    }

    // Absence means visible — see the migration. Existing accounts have no
    // row and are unaffected.
    const visibilityRow = await prisma.userProfileVisibility.findUnique({
      where: { userId: id },
      select: { showChurch: true, showLocation: true },
    });
    const visibility = {
      showChurch: visibilityRow?.showChurch ?? true,
      showLocation: visibilityRow?.showLocation ?? true,
    };

    const requestWhere = profileRequestWhere(id, isOwner);

    const [prayerRequests, visibleRequestCount, followerCount, followingCount, visiblePostCount, isFollowing] =
      await Promise.all([
        prisma.prayerRequest.findMany({
          where: requestWhere,
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        // Counts are scoped to the SAME rule as the list, so a visitor can
        // never infer how many hidden requests exist from a total that
        // disagrees with what they were shown.
        prisma.prayerRequest.count({ where: requestWhere }),
        prisma.follow.count({ where: { followingId: id } }),
        prisma.follow.count({ where: { followerId: id } }),
        // Archived posts are hidden from everyone but their author, so the
        // count has to match.
        prisma.post.count({ where: { userId: id, ...(isOwner ? {} : { isArchived: false }) } }),
        viewerId && !isOwner
          ? prisma.follow.findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: id } },
            }).then(Boolean)
          : Promise.resolve(false),
      ]);

    // Hidden fields are REMOVED from a visitor's payload, not left in for the
    // client to skip rendering. The owner always sees their own, plus the
    // switch positions so the editor can show them accurately.
    const visible = { ...user };
    if (!isOwner) {
      if (!visibility.showChurch) delete visible.churchName;
      if (!visibility.showLocation) delete visible.location;
    }

    const payload = {
      ...visible,
      ...(isOwner ? { profileVisibility: visibility } : {}),
      prayerRequests,
      _count: {
        followers: followerCount,
        following: followingCount,
        prayerRequests: visibleRequestCount,
        posts: visiblePostCount,
      },
      isOwner,
      isFollowing,
      isBlockedByMe: false,
    };

    // The prayer journey is computed ONLY for its owner. A visitor's request
    // does not even run these aggregates, so there is nothing to leak and
    // nothing for the client to have to remember to hide.
    if (isOwner) {
      const [sessions, distinctRequestsPrayedFor, totalSessions, todaySeconds] = await Promise.all([
        prisma.prayerSession.aggregate({
          where: { userId: id, durationSeconds: { not: null } },
          _sum: { durationSeconds: true },
          _avg: { durationSeconds: true },
        }),
        prisma.prayerSession.findMany({
          where: { userId: id },
          distinct: ['prayerRequestId'],
          select: { prayerRequestId: true },
        }),
        prisma.prayerSession.count({ where: { userId: id, durationSeconds: { gt: 0 } } }),
        getTodayPrayerTime(id),
      ]);

      payload.stats = {
        // NAME CHANGED, VALUE UNCHANGED. This is `distinct prayerRequestId`,
        // i.e. how many distinct REQUESTS this user has prayed for — not how
        // many distinct people. One person posting three requests counts three
        // here. The old key `totalPeoplePrayedFor` claimed something the query
        // never computed; the number itself is untouched.
        distinctRequestsPrayedFor: distinctRequestsPrayedFor.length,
        totalPrayerSeconds: sessions._sum.durationSeconds || 0,
        avgSessionSeconds: Math.round(sessions._avg.durationSeconds || 0),
        totalSessions,
        streak: user.prayerStreak,
        longestStreak: user.longestPrayerStreak,
        todaySeconds,
      };
    }

    res.json(payload);
  } catch (err) {
    console.error('[profile] getProfile', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

async function getMe(req, res) {
  req.params.id = req.user.id;
  getProfile(req, res);
}

async function updateProfile(req, res) {
  const { name, bio, churchName, location, gender } = req.body;
  const profilePhoto = req.files?.profilePhoto?.[0]?.path || undefined;
  const coverPhoto = req.files?.coverPhoto?.[0]?.path || undefined;

  try {
    const data = { name, bio, churchName, location };
    if (gender === 'male' || gender === 'female') data.gender = gender;
    if (profilePhoto) data.profilePhoto = profilePhoto;
    if (coverPhoto) data.coverPhoto = coverPhoto;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true, name: true, bio: true, churchName: true,
        location: true, profilePhoto: true, coverPhoto: true, email: true,
        gender: true,
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
      prisma.prayerSession.findMany({ where: { userId: id }, distinct: ['prayerRequestId'], select: { prayerRequestId: true } }),
      prisma.prayerSession.count({ where: { userId: id, durationSeconds: { gt: 0 } } }),
      prisma.user.findUnique({ where: { id }, select: { prayerStreak: true, longestPrayerStreak: true, graceDaysAvailable: true } }),
    ]);

    const todaySeconds = await getTodayPrayerTime(id);

    res.json({
      totalPeoplePrayedFor: uniquePrayedFor.length,
      totalPrayerSeconds: sessions._sum.durationSeconds || 0,
      avgSessionSeconds: Math.round(sessions._avg.durationSeconds || 0),
      totalSessions,
      streak: user.prayerStreak,
      longestStreak: user.longestPrayerStreak,
      graceDaysAvailable: user.graceDaysAvailable,
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
