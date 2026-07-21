const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const prisma = require('../db');

router.use(authenticate, requireAdmin);

// Content types that carry an isRemoved soft-delete flag.
const REMOVABLE = {
  PRAYER: 'prayerRequest',
  CONFESSION: 'confession',
  COMMENT: 'confessionComment',
  MESSAGE: 'message',
};

// Load the reported content for admin review. For confessions, authorship is
// resolved ONLY here, deliberately, via ConfessionAuthor — and returned under a
// `sensitiveAuthor` flag so the UI can mark it as revealed for moderation only.
async function loadContent(contentType, contentId) {
  switch (contentType) {
    case 'PRAYER': {
      const r = await prisma.prayerRequest.findUnique({
        where: { id: contentId },
        include: { user: { select: { id: true, name: true } } },
      });
      return r && { kind: 'PRAYER', title: r.title, body: r.body, isRemoved: r.isRemoved, author: r.user, authorId: r.userId };
    }
    case 'CONFESSION': {
      const c = await prisma.confession.findUnique({ where: { id: contentId } });
      if (!c) return null;
      // Sensitive: deliberate author lookup for moderation only.
      const authorLink = await prisma.confessionAuthor.findUnique({
        where: { confessionId: contentId },
        include: { user: { select: { id: true, name: true } } },
      });
      return {
        kind: 'CONFESSION', content: c.content, isRemoved: c.isRemoved,
        sensitiveAuthor: authorLink ? authorLink.user : null,
        authorId: authorLink?.userId || null,
      };
    }
    case 'COMMENT': {
      const cm = await prisma.confessionComment.findUnique({
        where: { id: contentId },
        include: { user: { select: { id: true, name: true } } },
      });
      return cm && { kind: 'COMMENT', content: cm.content, isRemoved: cm.isRemoved, isAnonymous: cm.isAnonymous, author: cm.user, authorId: cm.userId };
    }
    case 'MESSAGE': {
      const m = await prisma.message.findUnique({
        where: { id: contentId },
        include: { sender: { select: { id: true, name: true } } },
      });
      return m && { kind: 'MESSAGE', content: m.content, isRemoved: m.isRemoved, author: m.sender, authorId: m.senderId };
    }
    case 'PROFILE': {
      const u = await prisma.user.findUnique({ where: { id: contentId }, select: { id: true, name: true, bio: true, isSuspended: true } });
      return u && { kind: 'PROFILE', name: u.name, bio: u.bio, isSuspended: u.isSuspended, authorId: u.id };
    }
    case 'PRAYER_CELL': {
      const cell = await prisma.prayerCell.findUnique({ where: { id: contentId }, include: { host: { select: { id: true, name: true } } } });
      return cell && { kind: 'PRAYER_CELL', isActive: cell.isActive, author: cell.host, authorId: cell.hostId };
    }
    default:
      return null;
  }
}

// GET /api/admin/reports?status=PENDING
router.get('/reports', async (req, res) => {
  const status = req.query.status || 'PENDING';
  try {
    const reports = await prisma.report.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { reporter: { select: { id: true, name: true } } },
    });

    const enriched = await Promise.all(reports.map(async (r) => {
      const content = await loadContent(r.contentType, r.contentId).catch(() => null);
      // Non-confession reports may carry a reportedUserId; resolve their name.
      let reportedUser = null;
      if (r.reportedUserId) {
        reportedUser = await prisma.user.findUnique({ where: { id: r.reportedUserId }, select: { id: true, name: true } });
      }
      return {
        id: r.id,
        reason: r.reason,
        details: r.details,
        contentType: r.contentType,
        contentId: r.contentId,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        reporter: r.reporter,
        reportedUser,
        content, // includes sensitiveAuthor for confessions
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('admin list reports error:', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// PATCH /api/admin/reports/:id — set status
router.patch('/reports/:id', async (req, res) => {
  const { status } = req.body || {};
  if (!['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, reviewedAt: status === 'PENDING' ? null : new Date() },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// POST /api/admin/content/remove — soft-remove content + ACTION related reports
router.post('/content/remove', async (req, res) => {
  const { contentType, contentId, reason } = req.body || {};
  const model = REMOVABLE[contentType];
  if (!model) return res.status(400).json({ error: `Cannot remove content of type ${contentType}. Suspend the user instead.` });
  if (!contentId) return res.status(400).json({ error: 'contentId required' });
  try {
    await prisma[model].update({
      where: { id: contentId },
      data: { isRemoved: true, removedReason: reason?.slice(0, 500) || 'Removed by moderator' },
    });
    await prisma.report.updateMany({
      where: { contentType, contentId, status: { in: ['PENDING', 'REVIEWED'] } },
      data: { status: 'ACTIONED', reviewedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('admin remove content error:', err);
    res.status(500).json({ error: 'Failed to remove content' });
  }
});

// POST /api/admin/users/:id/suspend — disable a repeat-offender account
router.post('/users/:id/suspend', async (req, res) => {
  const suspend = req.body?.suspend !== false; // default true; pass false to un-suspend
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isSuspended: suspend } });
    res.json({ success: true, isSuspended: suspend });
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
