const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { isBlockedBetween } = require('../utils/blocks');
const { uploadCellImage } = require('../services/cloudinaryService');
const { createNotification } = require('../utils/notify');

const USER_CARD = { id: true, name: true, profilePhoto: true, isVerifiedPastor: true };

// First name of the acting user, for notification copy.
async function actorName(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name || 'Someone';
}

// Admin userIds of a cell (creator + promoted admins).
async function adminIdsFor(cellId) {
  const admins = await prisma.prayerCellMember.findMany({
    where: { cellId, role: 'admin' }, select: { userId: true },
  });
  return admins.map(a => a.userId);
}

// --- helpers ---------------------------------------------------------------

async function getMembership(cellId, userId) {
  return prisma.prayerCellMember.findUnique({
    where: { cellId_userId: { cellId, userId } },
  });
}

// Live = an active session that still has at least one present participant.
async function activeSessionFor(cellId) {
  const session = await prisma.prayerCellSession.findFirst({
    where: { cellId, isActive: true },
    orderBy: { startedAt: 'desc' },
    include: {
      participants: {
        where: { leftAt: null },
        include: { user: { select: USER_CARD } },
      },
    },
  });
  if (!session) return null;
  if (session.participants.length === 0) return null; // orphaned — treat as not live
  return session;
}

// Ends a session and rolls its duration into the cell's running stats.
async function endSession(session) {
  const endedAt = new Date();
  const minutes = Math.max(0, Math.round((endedAt - new Date(session.startedAt)) / 60000));
  await prisma.$transaction([
    prisma.prayerCellSession.update({
      where: { id: session.id },
      data: { isActive: false, endedAt },
    }),
    prisma.prayerCell.update({
      where: { id: session.cellId },
      data: {
        totalSessions: { increment: 1 },
        totalMinutes: { increment: minutes },
        lastActiveAt: endedAt,
      },
    }),
  ]);
  return minutes;
}

// --- image upload ----------------------------------------------------------

router.post('/image', authenticate, (req, res) => {
  uploadCellImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    res.json({ imageUrl: req.file.path });
  });
});

// --- directory + search ----------------------------------------------------

// GET /prayer-cells?q=   — browsable/searchable list of group cells
router.get('/', authenticate, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const cells = await prisma.prayerCell.findMany({
      where,
      include: {
        creator: { select: USER_CARD },
        _count: { select: { members: true } },
        members: { where: { userId: req.user.id }, select: { role: true }, take: 1 },
        sessions: {
          where: { isActive: true },
          select: { id: true, _count: { select: { participants: { where: { leftAt: null } } } } },
        },
      },
      orderBy: [{ lastActiveAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 100,
    });

    const list = cells.map(c => {
      const liveCount = c.sessions.reduce((n, s) => n + (s._count.participants || 0), 0);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        joinPolicy: c.joinPolicy,
        memberCount: c._count.members,
        creator: c.creator,
        isMember: c.members.length > 0,
        myRole: c.members[0]?.role || null,
        liveNow: liveCount > 0,
        liveCount,
        lastActiveAt: c.lastActiveAt,
        createdAt: c.createdAt,
        totalSessions: c.totalSessions,
      };
    });
    res.json(list);
  } catch (err) {
    console.error('cells.directory:', err);
    res.status(500).json({ error: 'Failed to load prayer cells' });
  }
});

// GET /prayer-cells/mine — cells the current user belongs to
router.get('/mine', authenticate, async (req, res) => {
  try {
    const memberships = await prisma.prayerCellMember.findMany({
      where: { userId: req.user.id },
      include: {
        cell: {
          include: {
            creator: { select: USER_CARD },
            _count: { select: { members: true } },
            sessions: {
              where: { isActive: true },
              select: { _count: { select: { participants: { where: { leftAt: null } } } } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    const list = memberships.map(m => {
      const liveCount = m.cell.sessions.reduce((n, s) => n + (s._count.participants || 0), 0);
      return {
        id: m.cell.id,
        name: m.cell.name,
        description: m.cell.description,
        imageUrl: m.cell.imageUrl,
        joinPolicy: m.cell.joinPolicy,
        memberCount: m.cell._count.members,
        creator: m.cell.creator,
        isMember: true,
        myRole: m.role,
        liveNow: liveCount > 0,
        liveCount,
      };
    });
    res.json(list);
  } catch (err) {
    console.error('cells.mine:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// --- create ----------------------------------------------------------------

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, imageUrl, joinPolicy } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'A cell name is required' });
    const policy = joinPolicy === 'request' ? 'request' : 'open';

    const cell = await prisma.prayerCell.create({
      data: {
        name: name.trim().slice(0, 80),
        description: description?.trim()?.slice(0, 500) || null,
        imageUrl: imageUrl || null,
        joinPolicy: policy,
        creatorId: req.user.id,
        lastActiveAt: new Date(),
        members: { create: { userId: req.user.id, role: 'admin' } },
      },
    });
    res.status(201).json(cell);
  } catch (err) {
    console.error('cells.create:', err);
    res.status(500).json({ error: 'Failed to create cell' });
  }
});

// --- detail ----------------------------------------------------------------

router.get('/:cellId', authenticate, async (req, res) => {
  try {
    const cell = await prisma.prayerCell.findUnique({
      where: { id: req.params.cellId },
      include: {
        creator: { select: USER_CARD },
        members: { include: { user: { select: USER_CARD } }, orderBy: { joinedAt: 'asc' } },
        _count: { select: { members: true } },
      },
    });
    if (!cell) return res.status(404).json({ error: 'Cell not found' });

    const me = cell.members.find(m => m.userId === req.user.id) || null;
    const session = await activeSessionFor(cell.id);
    let joinRequestStatus = null;
    if (!me) {
      const jr = await prisma.prayerCellJoinRequest.findUnique({
        where: { cellId_userId: { cellId: cell.id, userId: req.user.id } },
        select: { status: true },
      });
      joinRequestStatus = jr?.status || null;
    }
    let pendingRequestCount = 0;
    if (me?.role === 'admin') {
      pendingRequestCount = await prisma.prayerCellJoinRequest.count({
        where: { cellId: cell.id, status: 'pending' },
      });
    }

    res.json({
      id: cell.id,
      name: cell.name,
      description: cell.description,
      imageUrl: cell.imageUrl,
      joinPolicy: cell.joinPolicy,
      createdAt: cell.createdAt,
      lastActiveAt: cell.lastActiveAt,
      totalSessions: cell.totalSessions,
      totalMinutes: cell.totalMinutes,
      creator: cell.creator,
      creatorId: cell.creatorId,
      memberCount: cell._count.members,
      isMember: !!me,
      myRole: me?.role || null,
      joinRequestStatus,
      pendingRequestCount,
      members: cell.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        profilePhoto: m.user.profilePhoto,
        isVerifiedPastor: m.user.isVerifiedPastor,
        role: m.role,
        joinedAt: m.joinedAt,
        isCreator: m.userId === cell.creatorId,
      })),
      activeSession: session && {
        id: session.id,
        startedAt: session.startedAt,
        participants: session.participants.map(p => p.user),
      },
    });
  } catch (err) {
    console.error('cells.detail:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// --- stats -----------------------------------------------------------------

router.get('/:cellId/stats', authenticate, async (req, res) => {
  try {
    const cell = await prisma.prayerCell.findUnique({
      where: { id: req.params.cellId },
      include: { _count: { select: { members: true } } },
    });
    if (!cell) return res.status(404).json({ error: 'Cell not found' });
    const activeSessions = await prisma.prayerCellSession.count({ where: { cellId: cell.id } });
    res.json({
      totalSessions: cell.totalSessions,
      totalMinutes: cell.totalMinutes,
      sessionsEverStarted: activeSessions,
      memberCount: cell._count.members,
      createdAt: cell.createdAt,
      lastActiveAt: cell.lastActiveAt,
    });
  } catch (err) {
    console.error('cells.stats:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// --- join / leave ----------------------------------------------------------

router.post('/:cellId/join', authenticate, async (req, res) => {
  try {
    const cell = await prisma.prayerCell.findUnique({
      where: { id: req.params.cellId },
      select: { id: true, name: true, joinPolicy: true, creatorId: true },
    });
    if (!cell) return res.status(404).json({ error: 'Cell not found' });

    const existing = await getMembership(cell.id, req.user.id);
    if (existing) return res.json({ status: 'member' });

    // Moderation: can't join a cell whose creator is in a block relationship.
    if (await isBlockedBetween(req.user.id, cell.creatorId)) {
      return res.status(403).json({ error: 'You cannot join this prayer cell.' });
    }

    const io = req.app.get('io');
    if (cell.joinPolicy === 'open') {
      await prisma.prayerCellMember.create({ data: { cellId: cell.id, userId: req.user.id, role: 'member' } });
      res.json({ status: 'member' });
      // Notify the cell's admins that someone joined (fire-and-forget).
      (async () => {
        const [name, adminIds] = await Promise.all([actorName(req.user.id), adminIdsFor(cell.id)]);
        for (const adminId of adminIds) {
          if (adminId === req.user.id) continue;
          await createNotification(io, { userId: adminId, type: 'CELL_MEMBER_JOINED', message: `${name} joined ${cell.name}`, fromUser: req.user.id, refId: cell.id });
        }
      })().catch(() => {});
      return;
    }

    // request policy → create / re-open a pending request
    await prisma.prayerCellJoinRequest.upsert({
      where: { cellId_userId: { cellId: cell.id, userId: req.user.id } },
      update: { status: 'pending', createdAt: new Date() },
      create: { cellId: cell.id, userId: req.user.id, status: 'pending' },
    });
    res.json({ status: 'requested' });
    // Notify admins there's a request awaiting approval (fire-and-forget).
    (async () => {
      const [name, adminIds] = await Promise.all([actorName(req.user.id), adminIdsFor(cell.id)]);
      for (const adminId of adminIds) {
        if (adminId === req.user.id) continue;
        await createNotification(io, { userId: adminId, type: 'CELL_JOIN_REQUEST', message: `${name} requested to join ${cell.name}`, fromUser: req.user.id, refId: cell.id });
      }
    })().catch(() => {});
  } catch (err) {
    console.error('cells.join:', err);
    res.status(500).json({ error: 'Failed to join' });
  }
});

router.post('/:cellId/leave', authenticate, async (req, res) => {
  try {
    const cell = await prisma.prayerCell.findUnique({
      where: { id: req.params.cellId }, select: { creatorId: true },
    });
    if (!cell) return res.status(404).json({ error: 'Cell not found' });
    if (cell.creatorId === req.user.id) {
      return res.status(400).json({ error: 'The creator cannot leave. Delete the cell instead.' });
    }
    await prisma.prayerCellMember.deleteMany({ where: { cellId: req.params.cellId, userId: req.user.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('cells.leave:', err);
    res.status(500).json({ error: 'Failed to leave' });
  }
});

// --- admin: edit / delete --------------------------------------------------

// Guard: attaches req.membership, 403s non-admins.
async function requireAdmin(req, res, next) {
  const m = await getMembership(req.params.cellId, req.user.id);
  if (!m || m.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  req.membership = m;
  next();
}

router.patch('/:cellId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, joinPolicy } = req.body;
    const data = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim().slice(0, 80);
    if (typeof description === 'string') data.description = description.trim().slice(0, 500) || null;
    if (typeof imageUrl === 'string') data.imageUrl = imageUrl || null;
    if (joinPolicy === 'open' || joinPolicy === 'request') data.joinPolicy = joinPolicy;
    const cell = await prisma.prayerCell.update({ where: { id: req.params.cellId }, data });
    res.json(cell);
  } catch (err) {
    console.error('cells.edit:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:cellId', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.prayerCell.delete({ where: { id: req.params.cellId } });
    res.json({ success: true });
  } catch (err) {
    console.error('cells.delete:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// --- admin: members --------------------------------------------------------

// Add a user directly (search → add). Blocked users cannot be added.
router.post('/:cellId/members', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const cell = await prisma.prayerCell.findUnique({ where: { id: req.params.cellId }, select: { name: true, creatorId: true } });
    if (await isBlockedBetween(req.user.id, userId) || await isBlockedBetween(cell.creatorId, userId)) {
      return res.status(403).json({ error: 'This user cannot be added.' });
    }
    const alreadyMember = await getMembership(req.params.cellId, userId);
    const member = await prisma.prayerCellMember.upsert({
      where: { cellId_userId: { cellId: req.params.cellId, userId } },
      update: {},
      create: { cellId: req.params.cellId, userId, role: 'member' },
      include: { user: { select: USER_CARD } },
    });
    // If they had a pending request, mark it approved.
    await prisma.prayerCellJoinRequest.updateMany({
      where: { cellId: req.params.cellId, userId, status: 'pending' },
      data: { status: 'approved' },
    });
    res.json(member);
    // Let the newly added user know (only if they weren't already in).
    if (!alreadyMember) {
      createNotification(req.app.get('io'), {
        userId, type: 'CELL_REQUEST_APPROVED',
        message: `You're now a member of ${cell.name}`,
        fromUser: req.user.id, refId: req.params.cellId,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('cells.addMember:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:cellId/members/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const cell = await prisma.prayerCell.findUnique({ where: { id: req.params.cellId }, select: { creatorId: true } });
    if (cell.creatorId === req.params.userId) {
      return res.status(400).json({ error: 'The creator cannot be removed.' });
    }
    await prisma.prayerCellMember.deleteMany({ where: { cellId: req.params.cellId, userId: req.params.userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('cells.removeMember:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Promote / demote (role: "admin" | "member")
router.patch('/:cellId/members/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'member') return res.status(400).json({ error: 'Invalid role' });
    const cell = await prisma.prayerCell.findUnique({ where: { id: req.params.cellId }, select: { creatorId: true } });
    if (cell.creatorId === req.params.userId && role !== 'admin') {
      return res.status(400).json({ error: 'The creator must remain an admin.' });
    }
    const updated = await prisma.prayerCellMember.updateMany({
      where: { cellId: req.params.cellId, userId: req.params.userId },
      data: { role },
    });
    if (updated.count === 0) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('cells.setRole:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// --- admin: join requests --------------------------------------------------

router.get('/:cellId/requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const requests = await prisma.prayerCellJoinRequest.findMany({
      where: { cellId: req.params.cellId, status: 'pending' },
      include: { user: { select: USER_CARD } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(requests);
  } catch (err) {
    console.error('cells.requests:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:cellId/requests/:requestId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { action } = req.body; // "approve" | "deny"
    const request = await prisma.prayerCellJoinRequest.findUnique({ where: { id: req.params.requestId } });
    if (!request || request.cellId !== req.params.cellId) return res.status(404).json({ error: 'Request not found' });

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.prayerCellMember.upsert({
          where: { cellId_userId: { cellId: request.cellId, userId: request.userId } },
          update: {},
          create: { cellId: request.cellId, userId: request.userId, role: 'member' },
        }),
        prisma.prayerCellJoinRequest.update({ where: { id: request.id }, data: { status: 'approved' } }),
      ]);
      res.json({ status: 'approved' });
      // Tell the requester they're in (fire-and-forget).
      (async () => {
        const cell = await prisma.prayerCell.findUnique({ where: { id: request.cellId }, select: { name: true } });
        await createNotification(req.app.get('io'), {
          userId: request.userId, type: 'CELL_REQUEST_APPROVED',
          message: `You're now a member of ${cell?.name || 'the cell'}`,
          fromUser: req.user.id, refId: request.cellId,
        });
      })().catch(() => {});
      return;
    }
    await prisma.prayerCellJoinRequest.update({ where: { id: request.id }, data: { status: 'denied' } });
    res.json({ status: 'denied' });
  } catch (err) {
    console.error('cells.resolveRequest:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// --- live sessions ---------------------------------------------------------

// Start OR join the cell's live session (idempotent). Members only.
router.post('/:cellId/session/start', authenticate, async (req, res) => {
  try {
    const m = await getMembership(req.params.cellId, req.user.id);
    if (!m) return res.status(403).json({ error: 'Join the cell to pray live' });

    let session = await prisma.prayerCellSession.findFirst({
      where: { cellId: req.params.cellId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });
    const isNewSession = !session;
    if (!session) {
      session = await prisma.prayerCellSession.create({
        data: { cellId: req.params.cellId, startedById: req.user.id },
      });
    }
    // Upsert my participation (re-joining clears a previous leftAt).
    await prisma.prayerCellSessionParticipant.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId: req.user.id } },
      update: { leftAt: null, joinedAt: new Date() },
      create: { sessionId: session.id, userId: req.user.id },
    });
    await prisma.prayerCell.update({ where: { id: req.params.cellId }, data: { lastActiveAt: new Date() } });

    const io = req.app.get('io');
    if (io) io.emit('cell:directory_updated');

    const full = await activeSessionFor(req.params.cellId);
    res.json({
      sessionId: session.id,
      participants: full ? full.participants.map(p => p.user) : [],
    });

    // Only when this call actually STARTED the session: rally the other members.
    if (isNewSession) {
      (async () => {
        const [name, cell, members] = await Promise.all([
          actorName(req.user.id),
          prisma.prayerCell.findUnique({ where: { id: req.params.cellId }, select: { name: true } }),
          prisma.prayerCellMember.findMany({ where: { cellId: req.params.cellId }, select: { userId: true } }),
        ]);
        for (const mem of members) {
          if (mem.userId === req.user.id) continue;
          await createNotification(io, {
            userId: mem.userId, type: 'CELL_SESSION_STARTED',
            message: `${name} started a prayer session in ${cell?.name || 'a cell'} — join now`,
            fromUser: req.user.id, refId: req.params.cellId,
          });
        }
      })().catch(() => {});
    }
  } catch (err) {
    console.error('cells.session.start:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Leave the live session; when the last participant leaves, end it + bank stats.
router.post('/:cellId/session/leave', authenticate, async (req, res) => {
  try {
    const session = await prisma.prayerCellSession.findFirst({
      where: { cellId: req.params.cellId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!session) return res.json({ success: true, ended: false });

    await prisma.prayerCellSessionParticipant.updateMany({
      where: { sessionId: session.id, userId: req.user.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    const remaining = await prisma.prayerCellSessionParticipant.count({
      where: { sessionId: session.id, leftAt: null },
    });
    let ended = false, minutes = 0;
    if (remaining === 0) {
      minutes = await endSession(session);
      ended = true;
    }
    const io = req.app.get('io');
    if (io) io.emit('cell:directory_updated');
    res.json({ success: true, ended, minutes });
  } catch (err) {
    console.error('cells.session.leave:', err);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

module.exports = router;
