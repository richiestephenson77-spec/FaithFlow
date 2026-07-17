const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

const prisma = require('../db');
const {
  getFeed, createRequest, startSession, endSession, deleteRequest,
  markAnswered, getAnsweredFeed, getPrayedForMe, getRequest,
  getMyRequests, editRequest, addUpdate,
} = require('../controllers/prayerController');

// Draft endpoints — must be before /:id routes
router.get('/draft', authenticate, async (req, res) => {
  try {
    const draft = await prisma.prayerDraft.findUnique({ where: { userId: req.user.id } });
    res.json(draft || null);
  } catch { res.status(500).json({ error: 'Failed to get draft' }); }
});

router.patch('/draft', authenticate, async (req, res) => {
  const { title, body, category, visibility, isUrgent } = req.body;
  try {
    const draft = await prisma.prayerDraft.upsert({
      where: { userId: req.user.id },
      update: { title: title ?? '', body: body ?? '', category: category ?? 'GENERAL', visibility: visibility ?? 'PUBLIC', isUrgent: Boolean(isUrgent) },
      create: { userId: req.user.id, title: title ?? '', body: body ?? '', category: category ?? 'GENERAL', visibility: visibility ?? 'PUBLIC', isUrgent: Boolean(isUrgent) },
    });
    res.json({ saved: true, updatedAt: draft.updatedAt });
  } catch { res.status(500).json({ error: 'Failed to save draft' }); }
});

router.delete('/draft', authenticate, async (req, res) => {
  try {
    await prisma.prayerDraft.deleteMany({ where: { userId: req.user.id } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed to delete draft' }); }
});

router.get('/live-count', authenticate, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.prayerSession.count({ where: { startedAt: { gte: since } } });
    res.json({ count });
  } catch { res.status(500).json({ count: 0 }); }
});

router.get('/feed', authenticate, getFeed);
router.get('/answered', authenticate, getAnsweredFeed);
router.get('/prayed-for-me', authenticate, getPrayedForMe);
router.get('/mine', authenticate, getMyRequests);
router.post('/', authenticate, createRequest);
router.get('/:id', authenticate, getRequest);
router.put('/:id', authenticate, editRequest);
router.post('/:id/start', authenticate, startSession);
router.post('/:id/answered', authenticate, markAnswered);
router.post('/:id/update', authenticate, addUpdate);
router.post('/session/:sessionId/end', authenticate, endSession);
router.delete('/:id', authenticate, deleteRequest);

module.exports = router;
