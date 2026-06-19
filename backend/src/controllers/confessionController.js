
const prisma = require('../db');

async function getConfessions(req, res) {
  const { category } = req.query;
  const where = category && category !== 'All' ? { category } : {};
  try {
    const confessions = await prisma.confession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        _count: { select: { encouragements: true, comments: true } },
        encouragements: req.user ? { where: { userId: req.user.id }, select: { id: true } } : false,
      },
    });

    // Score: heartCount*2 + commentCount + recencyBoost
    const now = Date.now();
    const scored = confessions.map(c => {
      const heartCount = c._count.encouragements;
      const commentCount = c._count.comments;
      const ageHours = (now - new Date(c.createdAt).getTime()) / 3600000;
      const recencyBoost = ageHours < 24 ? 10 : 0;
      const score = heartCount * 2 + commentCount + recencyBoost;
      return {
        id: c.id,
        content: c.content,
        category: c.category,
        createdAt: c.createdAt,
        heartCount,
        commentCount,
        hasHearted: req.user ? c.encouragements.length > 0 : false,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json(scored.map(({ score, ...rest }) => rest));
  } catch {
    res.status(500).json({ error: 'Failed to get confessions' });
  }
}

async function getConfession(req, res) {
  const { id } = req.params;
  try {
    const c = await prisma.confession.findUnique({
      where: { id },
      include: {
        _count: { select: { encouragements: true, comments: true } },
        encouragements: req.user ? { where: { userId: req.user.id }, select: { id: true } } : false,
      },
    });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: c.id,
      content: c.content,
      category: c.category,
      createdAt: c.createdAt,
      heartCount: c._count.encouragements,
      commentCount: c._count.comments,
      hasHearted: req.user ? c.encouragements.length > 0 : false,
    });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function createConfession(req, res) {
  const { content, category } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  if (content.trim().length < 10) return res.status(400).json({ error: 'Confession must be at least 10 characters' });
  if (content.trim().length > 500) return res.status(400).json({ error: 'Confession too long (max 500 characters)' });
  try {
    const c = await prisma.confession.create({
      data: { userId: req.user.id, content: content.trim(), category: category || 'General' },
    });
    res.status(201).json({ id: c.id, content: c.content, category: c.category, createdAt: c.createdAt, heartCount: 0, commentCount: 0, hasHearted: false });
  } catch {
    res.status(500).json({ error: 'Failed to post confession' });
  }
}

async function heart(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.confessionEncouragement.findUnique({
      where: { confessionId_userId: { confessionId: id, userId: req.user.id } },
    });
    if (existing) {
      await prisma.confessionEncouragement.delete({ where: { id: existing.id } });
      const heartCount = await prisma.confessionEncouragement.count({ where: { confessionId: id } });
      return res.json({ hearted: false, heartCount });
    }
    await prisma.confessionEncouragement.create({ data: { confessionId: id, userId: req.user.id } });
    const heartCount = await prisma.confessionEncouragement.count({ where: { confessionId: id } });
    res.json({ hearted: true, heartCount });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function getComments(req, res) {
  const { id } = req.params;
  try {
    const comments = await prisma.confessionComment.findMany({
      where: { confessionId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, profilePhoto: true, prayerWarriorBadge: true } } },
    });
    res.json(comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      isAnonymous: c.isAnonymous,
      commenter: c.isAnonymous ? null : {
        name: c.user.name,
        profilePhoto: c.user.profilePhoto,
        prayerWarriorBadge: c.user.prayerWarriorBadge,
      },
    })));
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function addComment(req, res) {
  const { id } = req.params;
  const { content, isAnonymous = false } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  if (content.trim().length < 2) return res.status(400).json({ error: 'Comment too short' });
  if (content.trim().length > 300) return res.status(400).json({ error: 'Comment too long (max 300 characters)' });
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, profilePhoto: true, prayerWarriorBadge: true },
    });
    const c = await prisma.confessionComment.create({
      data: { confessionId: id, userId: req.user.id, content: content.trim(), isAnonymous: Boolean(isAnonymous) },
    });
    res.status(201).json({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      isAnonymous: c.isAnonymous,
      commenter: c.isAnonymous ? null : { name: me.name, profilePhoto: me.profilePhoto, prayerWarriorBadge: me.prayerWarriorBadge },
    });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { getConfessions, getConfession, createConfession, heart, getComments, addComment };
