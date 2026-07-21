const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');

const VALID_REASONS = ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'SEXUAL_CONTENT', 'VIOLENCE', 'SELF_HARM', 'MISINFORMATION', 'OTHER'];
const VALID_CONTENT_TYPES = ['PRAYER', 'CONFESSION', 'COMMENT', 'MESSAGE', 'PROFILE', 'PRAYER_CELL'];

// Cap report submissions to blunt report-spam / brigading.
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many reports. Please try again later.' },
});

// POST /api/reports — submit a report. Deduped per reporter+content.
router.post('/', authenticate, reportLimiter, async (req, res) => {
  const { contentType, contentId, reason, details, reportedUserId } = req.body || {};
  if (!VALID_CONTENT_TYPES.includes(contentType)) return res.status(400).json({ error: 'Invalid content type' });
  if (!contentId) return res.status(400).json({ error: 'contentId required' });
  if (!VALID_REASONS.includes(reason)) return res.status(400).json({ error: 'Invalid reason' });

  try {
    // Dedupe: one report per reporter per piece of content.
    const existing = await prisma.report.findFirst({
      where: { reporterId: req.user.id, contentType, contentId },
      select: { id: true },
    });
    if (existing) return res.json({ success: true, alreadyReported: true });

    await prisma.report.create({
      data: {
        reporterId: req.user.id,
        contentType,
        contentId,
        reason,
        details: details?.slice(0, 1000) || null,
        // For confessions we deliberately DO NOT accept/derive an author here —
        // authorship is resolved only during admin review via ConfessionAuthor.
        reportedUserId: contentType === 'CONFESSION' ? null : (reportedUserId || null),
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('create report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
