const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { isBlockedBetween } = require('../utils/blocks');

// GET active + recent cells
router.get('/', authenticate, async (req, res) => {
  try {
    const hostSelect = {
      id: true, name: true, profilePhoto: true,
      totalPeoplesPrayedFor: true, isVerifiedPastor: true, prayerWarriorBadge: true,
    };

    const [activeCells, allRecentCells] = await Promise.all([
      prisma.prayerCell.findMany({
        where: { isActive: true },
        include: {
          host: { select: hostSelect },
          sessions: {
            where: { leftAt: null },
            include: { guest: { select: { id: true, name: true, profilePhoto: true } } },
          },
        },
        orderBy: { sessionCount: 'desc' },
      }),
      prisma.prayerCell.findMany({
        where: {
          isActive: false,
          endedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        include: { host: { select: hostSelect } },
        orderBy: { endedAt: 'desc' },
      }),
    ]);

    // Deduplicate: keep only the most recent cell per host (max 10)
    const seenHosts = new Set();
    const recentCells = [];
    for (const cell of allRecentCells) {
      if (!seenHosts.has(cell.hostId)) {
        seenHosts.add(cell.hostId);
        recentCells.push(cell);
      }
      if (recentCells.length >= 10) break;
    }

    res.json({ activeCells, recentCells });
  } catch (err) {
    console.error('getActiveCells:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Start a cell
router.post('/start', authenticate, async (req, res) => {
  try {
    await prisma.prayerCell.updateMany({
      where: { hostId: req.user.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });
    const cell = await prisma.prayerCell.create({
      data: { hostId: req.user.id },
    });
    res.json(cell);
  } catch (err) {
    console.error('startCell:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Join a cell
router.post('/:cellId/join', authenticate, async (req, res) => {
  try {
    // Moderation: a blocked user can't join a cell hosted by someone in a
    // block relationship with them (either direction).
    const cell = await prisma.prayerCell.findUnique({
      where: { id: req.params.cellId }, select: { hostId: true },
    });
    if (!cell) return res.status(404).json({ error: 'Cell not found' });
    if (await isBlockedBetween(req.user.id, cell.hostId)) {
      return res.status(403).json({ error: 'You cannot join this prayer cell.' });
    }

    const session = await prisma.prayerCellSession.create({
      data: { cellId: req.params.cellId, guestId: req.user.id },
    });
    res.json(session);
  } catch (err) {
    console.error('joinCell:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Leave a cell
router.post('/:cellId/leave', authenticate, async (req, res) => {
  try {
    await prisma.prayerCellSession.updateMany({
      where: { cellId: req.params.cellId, guestId: req.user.id, leftAt: null },
      data: { leftAt: new Date() },
    });
    await prisma.prayerCell.update({
      where: { id: req.params.cellId },
      data: { sessionCount: { increment: 1 } },
    });
    const cell = await prisma.prayerCell.findUnique({ where: { id: req.params.cellId } });
    if (cell) {
      await prisma.user.update({
        where: { id: cell.hostId },
        data: { totalPeoplesPrayedFor: { increment: 1 } },
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('leaveCell:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// End cell (host)
router.post('/:cellId/end', authenticate, async (req, res) => {
  try {
    await prisma.prayerCell.update({
      where: { id: req.params.cellId },
      data: { isActive: false, endedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('endCell:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
