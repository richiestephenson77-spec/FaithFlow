const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');

const PARTNER_SELECT = {
  id: true,
  name: true,
  profilePhoto: true,
  churchName: true,
  location: true,
  prayerWarriorBadge: true,
};

// GET current status — NONE | WAITING | MATCHED
router.get('/status', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  try {
    // Auto-expire any partnerships whose time has passed
    await prisma.prayerPartnership.updateMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      data: { status: 'COMPLETED' },
    });

    const partnership = await prisma.prayerPartnership.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
      include: {
        user1: { select: PARTNER_SELECT },
        user2: { select: PARTNER_SELECT },
      },
    });

    if (partnership) {
      const partner = partnership.user1Id === userId ? partnership.user2 : partnership.user1;
      const daysLeft = Math.ceil(
        (new Date(partnership.expiresAt) - now) / (1000 * 60 * 60 * 24)
      );
      return res.json({
        status: 'MATCHED',
        partner,
        partnership: {
          id: partnership.id,
          startedAt: partnership.startedAt,
          expiresAt: partnership.expiresAt,
          daysLeft,
        },
      });
    }

    const waiting = await prisma.prayerPartnerRequest.findFirst({
      where: { userId, status: 'WAITING' },
    });

    if (waiting) return res.json({ status: 'WAITING' });

    return res.json({ status: 'NONE' });
  } catch (err) {
    console.error('Prayer partner status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /join — enter matching queue
router.post('/join', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });

    if (!user.gender) {
      return res.status(400).json({ error: 'Please set your gender in Profile → Edit Profile first' });
    }

    const existing = await prisma.prayerPartnerRequest.findFirst({
      where: { userId, status: 'WAITING' },
    });
    if (existing) return res.status(400).json({ error: 'Already in queue' });

    const oppositeGender = user.gender === 'male' ? 'female' : 'male';

    const match = await prisma.prayerPartnerRequest.findFirst({
      where: { gender: oppositeGender, status: 'WAITING', userId: { not: userId } },
      orderBy: { createdAt: 'asc' },
    });

    if (match) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const partnership = await prisma.prayerPartnership.create({
        data: { user1Id: userId, user2Id: match.userId, expiresAt },
      });

      await prisma.prayerPartnerRequest.update({
        where: { id: match.id },
        data: { status: 'MATCHED' },
      });

      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: 'PRAYER_PARTNER_MATCHED',
            message: "You've been matched with a prayer partner! Pray for each other this week 🙏",
          },
          {
            userId: match.userId,
            type: 'PRAYER_PARTNER_MATCHED',
            message: "You've been matched with a prayer partner! Pray for each other this week 🙏",
          },
        ],
      });

      return res.json({ status: 'MATCHED', partnershipId: partnership.id });
    }

    await prisma.prayerPartnerRequest.create({
      data: { userId, gender: user.gender, status: 'WAITING' },
    });

    res.json({ status: 'WAITING' });
  } catch (err) {
    console.error('Prayer partner join error:', err);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// GET /partner-prayers
router.get('/partner-prayers', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  try {
    const partnership = await prisma.prayerPartnership.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
    });

    if (!partnership) return res.status(404).json({ error: 'No active partnership' });

    const partnerId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;

    const prayers = await prisma.prayerRequest.findMany({
      where: { userId: partnerId, isActive: true, isAnswered: false },
      include: {
        user: { select: { id: true, name: true, profilePhoto: true } },
        sessions: { select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      prayers: prayers.map(p => ({
        ...p,
        prayerCount: p.sessions.length,
        userHasPrayed: p.sessions.some(s => s.userId === userId),
        sessions: undefined,
      })),
    });
  } catch (err) {
    console.error('Partner prayers error:', err);
    res.status(500).json({ error: 'Failed to fetch partner prayers' });
  }
});

// POST /leave
router.post('/leave', authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    await prisma.prayerPartnership.updateMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
      },
      data: { status: 'CANCELLED' },
    });
    await prisma.prayerPartnerRequest.updateMany({
      where: { userId, status: 'WAITING' },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Leave partnership error:', err);
    res.status(500).json({ error: 'Failed to leave' });
  }
});

module.exports = router;
