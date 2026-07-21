const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');

// POST /api/blocks — block a user. Also tears down any follow relationship in
// either direction. An existing conversation is left intact but hidden from
// both sides by the message-block enforcement.
router.post('/', authenticate, async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (userId === req.user.id) return res.status(400).json({ error: "You can't block yourself" });

  try {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user.id, blockedId: userId } },
      update: {},
      create: { blockerId: req.user.id, blockedId: userId },
    });

    // Remove follows in both directions
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: req.user.id, followingId: userId },
          { followerId: userId, followingId: req.user.id },
        ],
      },
    });

    res.json({ success: true, blocked: true });
  } catch (err) {
    console.error('block error:', err);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/blocks/:userId — unblock
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    await prisma.block.deleteMany({
      where: { blockerId: req.user.id, blockedId: req.params.userId },
    });
    res.json({ success: true, blocked: false });
  } catch (err) {
    console.error('unblock error:', err);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// GET /api/blocks — users I've blocked (for the Settings screen)
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await prisma.block.findMany({
      where: { blockerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { blocked: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
    });
    res.json(rows.map(r => ({ id: r.blocked.id, name: r.blocked.name, profilePhoto: r.blocked.profilePhoto, churchName: r.blocked.churchName, blockedAt: r.createdAt })));
  } catch (err) {
    console.error('list blocks error:', err);
    res.status(500).json({ error: 'Failed to load blocked users' });
  }
});

module.exports = router;
