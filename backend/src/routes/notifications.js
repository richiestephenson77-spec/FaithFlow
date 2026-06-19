const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
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
