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

  // Attach sender info via fromUser field (batch lookup)
  const senderIds = [...new Set(notifications.map(n => n.fromUser).filter(Boolean))];
  let senderMap = {};
  if (senderIds.length > 0) {
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, profilePhoto: true },
    });
    senderMap = Object.fromEntries(senders.map(s => [s.id, s]));
  }

  res.json(notifications.map(n => ({
    ...n,
    sender: n.fromUser ? (senderMap[n.fromUser] || null) : null,
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
