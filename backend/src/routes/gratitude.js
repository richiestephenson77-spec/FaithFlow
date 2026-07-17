const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/gratitude/today — check if user already submitted today
router.get('/today', authenticate, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const entry = await prisma.gratitudeEntry.findFirst({
      where: { userId: req.user.id, createdAt: { gte: start } },
      select: { id: true, content: true, mood: true, isPublic: true, createdAt: true },
    });
    res.json(entry || null);
  } catch { res.status(500).json({ error: 'Failed to fetch today\'s entry' }); }
});

// GET /api/gratitude/public — public "Daily Grace" feed, newest first, paginated
router.get('/public', authenticate, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  try {
    const where = { isPublic: true };
    const [rows, total] = await Promise.all([
      prisma.gratitudeEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
      }),
      prisma.gratitudeEntry.count({ where }),
    ]);
    const items = rows.map(g => ({
      id: g.id,
      content: g.content,
      mood: g.mood,
      createdAt: g.createdAt,
      user: g.user,
    }));
    res.json({ items, page, hasMore: page * limit < total, total });
  } catch { res.status(500).json({ error: 'Failed to fetch public gratitude' }); }
});

// POST /api/gratitude — create today's entry + update streak
router.post('/', authenticate, async (req, res) => {
  const { content, mood, isPublic } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  try {
    const entry = await prisma.gratitudeEntry.create({
      data: { userId: req.user.id, content: content.trim(), mood: mood || null, isPublic: Boolean(isPublic) },
    });

    // Streak logic — mirrors how prayerStreak works on User
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { gratitudeStreak: true, lastGratitudeDate: true },
    });

    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastDate = user?.lastGratitudeDate?.toISOString().slice(0, 10);
    const alreadyDoneToday = lastDate === today;

    if (!alreadyDoneToday) {
      const isConsecutive = lastDate === yesterday;
      const newStreak = isConsecutive ? (user?.gratitudeStreak || 0) + 1 : 1;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { gratitudeStreak: newStreak, lastGratitudeDate: new Date() },
      });
      return res.status(201).json({ entry, streak: newStreak });
    }

    res.status(201).json({ entry, streak: user?.gratitudeStreak || 1 });
  } catch { res.status(500).json({ error: 'Failed to save entry' }); }
});

module.exports = router;
