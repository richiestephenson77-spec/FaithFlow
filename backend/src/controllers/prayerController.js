const { PrismaClient } = require('@prisma/client');
const { notifyUser } = require('../services/socketService');

const prisma = new PrismaClient();

async function getFeed(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const { category } = req.query;

  const where = { isActive: true, isAnswered: false };
  if (category && category !== 'ALL') where.category = category;

  try {
    const [urgent, regular] = await Promise.all([
      prisma.prayerRequest.findMany({
        where: { ...where, isUrgent: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
          _count: { select: { sessions: true } },
          sessions: { where: { endedAt: null }, select: { userId: true } },
        },
      }),
      prisma.prayerRequest.findMany({
        where: { ...where, isUrgent: false },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
          _count: { select: { sessions: true } },
          sessions: { where: { endedAt: null }, select: { userId: true } },
        },
      }),
    ]);

    const format = (r) => ({
      ...r,
      currentlyPrayingCount: r.sessions.length,
      totalPrayerCount: r._count.sessions,
      sessions: undefined,
    });

    res.json([...urgent.map(format), ...regular.map(format)]);
  } catch {
    res.status(500).json({ error: 'Failed to get feed' });
  }
}

async function createRequest(req, res) {
  const { title, body, category, isUrgent } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

  const validCategories = ['GENERAL','HEALTH','FAMILY','CAREER','FINANCIAL','RELATIONSHIP','SPIRITUAL'];
  const safeCategory = validCategories.includes(category) ? category : 'GENERAL';

  try {
    const request = await prisma.prayerRequest.create({
      data: { userId: req.user.id, title, body, category: safeCategory, isUrgent: Boolean(isUrgent) },
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
    });
    res.status(201).json({ ...request, currentlyPrayingCount: 0, totalPrayerCount: 0 });
  } catch {
    res.status(500).json({ error: 'Failed to create prayer request' });
  }
}

async function startSession(req, res) {
  const { id } = req.params;
  try {
    const prayerRequest = await prisma.prayerRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!prayerRequest) return res.status(404).json({ error: 'Prayer request not found' });

    // End any active session for this user on this request
    await prisma.prayerSession.updateMany({
      where: { userId: req.user.id, prayerRequestId: id, endedAt: null },
      data: { endedAt: new Date(), durationSeconds: 0 },
    });

    const session = await prisma.prayerSession.create({
      data: { userId: req.user.id, prayerRequestId: id },
    });

    // Notify the requester (not if praying for own request)
    if (prayerRequest.userId !== req.user.id) {
      const prayingUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true },
      });

      await prisma.notification.create({
        data: {
          userId: prayerRequest.userId,
          type: 'PRAYER_STARTED',
          message: `${prayingUser.name} has started praying for you`,
          fromUser: req.user.id,
          refId: id,
        },
      });

      const io = req.app.get('io');
      notifyUser(io, prayerRequest.userId, 'prayerStarted', {
        message: `${prayingUser.name} has started praying for you`,
        prayerRequestId: id,
        fromUser: { id: req.user.id, name: prayingUser.name },
      });
    }

    res.status(201).json(session);
  } catch {
    res.status(500).json({ error: 'Failed to start prayer session' });
  }
}

async function endSession(req, res) {
  const { sessionId } = req.params;
  try {
    const session = await prisma.prayerSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== req.user.id)
      return res.status(404).json({ error: 'Session not found' });
    if (session.endedAt) return res.status(400).json({ error: 'Session already ended' });

    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt - session.startedAt) / 1000);

    await prisma.prayerSession.update({
      where: { id: sessionId },
      data: { endedAt, durationSeconds },
    });

    // Streak logic
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { prayerStreak: true, longestPrayerStreak: true, lastPrayerDate: true },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const lastStr = user.lastPrayerDate
      ? new Date(user.lastPrayerDate).toISOString().split('T')[0]
      : null;

    let newStreak = user.prayerStreak;
    let streakIncreased = false;

    if (!lastStr) {
      // Case A: first ever prayer
      newStreak = 1;
      streakIncreased = true;
    } else if (lastStr === todayStr) {
      // Case B: already prayed today — no change
      newStreak = user.prayerStreak;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastStr === yesterdayStr) {
        // Case C: prayed yesterday — extend streak
        newStreak = user.prayerStreak + 1;
        streakIncreased = true;
      } else {
        // Case D: missed one or more days — reset
        newStreak = 1;
        streakIncreased = true;
      }
    }

    const newLongest = Math.max(newStreak, user.longestPrayerStreak);
    const isRecord = newStreak > user.longestPrayerStreak;

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        prayerStreak: newStreak,
        longestPrayerStreak: newLongest,
        lastPrayerDate: new Date(),
      },
    });

    res.json({
      durationSeconds,
      streak: {
        current: newStreak,
        longest: newLongest,
        increased: streakIncreased,
        isRecord,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to end session' });
  }
}

async function deleteRequest(req, res) {
  const { id } = req.params;
  try {
    const request = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!request || request.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    await prisma.prayerRequest.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete prayer request' });
  }
}

async function markAnswered(req, res) {
  const { id } = req.params;
  const { testimonyMessage } = req.body;
  try {
    const request = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!request || request.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.prayerRequest.update({
      where: { id },
      data: { isAnswered: true, answeredAt: new Date(), testimonyMessage: testimonyMessage || null },
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } }, _count: { select: { sessions: true } } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to mark as answered' });
  }
}

async function getAnsweredFeed(req, res) {
  try {
    const requests = await prisma.prayerRequest.findMany({
      where: { isAnswered: true },
      orderBy: { answeredAt: 'desc' },
      take: 5,
      include: {
        user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
        _count: { select: { sessions: true } },
      },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed to get answered prayers' });
  }
}

async function getRequest(req, res) {
  const { id } = req.params;
  try {
    const request = await prisma.prayerRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
        _count: { select: { sessions: true } },
      },
    });
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch {
    res.status(500).json({ error: 'Failed to get prayer request' });
  }
}

module.exports = { getFeed, createRequest, startSession, endSession, deleteRequest, markAnswered, getAnsweredFeed, getRequest };
