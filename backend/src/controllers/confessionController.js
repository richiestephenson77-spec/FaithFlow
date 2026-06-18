const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ANON = { name: 'Anonymous Believer', profilePhoto: null };

async function getConfessions(req, res) {
  const { category } = req.query;
  const where = category && category !== 'All' ? { category } : {};
  try {
    const confessions = await prisma.confession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { encouragements: true, comments: true } },
        encouragements: req.user ? { where: { userId: req.user.id }, select: { id: true } } : false,
      },
    });
    // Strip identity
    res.json(confessions.map(c => ({
      id: c.id,
      content: c.content,
      category: c.category,
      createdAt: c.createdAt,
      encouragementCount: c._count.encouragements,
      commentCount: c._count.comments,
      hasEncouraged: req.user ? c.encouragements.length > 0 : false,
    })));
  } catch {
    res.status(500).json({ error: 'Failed to get confessions' });
  }
}

async function createConfession(req, res) {
  const { content, category } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const c = await prisma.confession.create({
      data: { userId: req.user.id, content: content.trim(), category: category || 'General' },
    });
    res.status(201).json({ id: c.id, content: c.content, category: c.category, createdAt: c.createdAt, encouragementCount: 0, commentCount: 0, hasEncouraged: false });
  } catch {
    res.status(500).json({ error: 'Failed to post confession' });
  }
}

async function encourage(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.confessionEncouragement.findUnique({
      where: { confessionId_userId: { confessionId: id, userId: req.user.id } },
    });
    if (existing) {
      await prisma.confessionEncouragement.delete({ where: { id: existing.id } });
      return res.json({ encouraged: false });
    }
    await prisma.confessionEncouragement.create({ data: { confessionId: id, userId: req.user.id } });
    res.json({ encouraged: true });
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
    });
    res.json(comments.map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: ANON })));
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function addComment(req, res) {
  const { id } = req.params;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const c = await prisma.confessionComment.create({
      data: { confessionId: id, userId: req.user.id, content: content.trim() },
    });
    res.status(201).json({ id: c.id, content: c.content, createdAt: c.createdAt, user: ANON });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { getConfessions, createConfession, encourage, getComments, addComment };
