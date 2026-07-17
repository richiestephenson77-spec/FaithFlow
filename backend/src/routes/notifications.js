const router = require('express').Router();
const { authenticate } = require('../middleware/auth');


const prisma = require('../db');
const { createNotification } = require('../utils/notify');

// Computed-on-fetch (no cron): if the user has an active streak, hasn't prayed
// today, and it's late in the day, drop a one-per-day STREAK_AT_RISK nudge.
// NOTE: server runs on UTC, so "late in the day" is approximate without the
// user's timezone; threshold chosen conservatively to avoid firing too early.
async function maybeStreakAtRisk(req) {
  try {
    const now = new Date();
    if (now.getUTCHours() < 17) return; // not late enough
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { prayerStreak: true, lastPrayerDate: true, notifyStreakReminder: true },
    });
    if (!user || user.notifyStreakReminder === false) return;
    if (!user.prayerStreak || user.prayerStreak < 1) return;

    const todayStr = now.toISOString().slice(0, 10);
    const lastStr = user.lastPrayerDate ? new Date(user.lastPrayerDate).toISOString().slice(0, 10) : null;
    if (lastStr === todayStr) return; // already prayed today — safe

    const startToday = new Date(); startToday.setUTCHours(0, 0, 0, 0);
    const already = await prisma.notification.findFirst({
      where: { userId: req.user.id, type: 'STREAK_AT_RISK', createdAt: { gte: startToday } },
      select: { id: true },
    });
    if (already) return;

    await createNotification(req.app.get('io'), {
      userId: req.user.id,
      type: 'STREAK_AT_RISK',
      message: `Your ${user.prayerStreak}-day streak ends tonight — pray to keep it alive`,
    });
  } catch (e) { console.error('maybeStreakAtRisk error:', e); }
}

router.get('/', authenticate, async (req, res) => {
  await maybeStreakAtRisk(req);
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const senderIds = [...new Set(notifications.map(n => n.fromUser).filter(Boolean))];
  let senderMap = {};
  if (senderIds.length > 0) {
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, profilePhoto: true },
    });
    senderMap = Object.fromEntries(senders.map(s => [s.id, s]));
  }

  // Check which NEW_FOLLOWER senders the current user follows back
  const followerSenderIds = notifications
    .filter(n => n.type === 'NEW_FOLLOWER' && n.fromUser)
    .map(n => n.fromUser);
  let followedBackSet = new Set();
  if (followerSenderIds.length > 0) {
    const followedBack = await prisma.follow.findMany({
      where: { followerId: req.user.id, followingId: { in: followerSenderIds } },
      select: { followingId: true },
    });
    followedBackSet = new Set(followedBack.map(f => f.followingId));
  }

  res.json(notifications.map(n => ({
    ...n,
    sender: n.fromUser ? (senderMap[n.fromUser] || null) : null,
    isFollowedByMe: n.type === 'NEW_FOLLOWER' && n.fromUser ? followedBackSet.has(n.fromUser) : undefined,
  })));
});

router.post('/read-all', authenticate, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

module.exports = router;
