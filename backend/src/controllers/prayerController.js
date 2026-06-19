const { PrismaClient } = require('@prisma/client');
const { notifyUser } = require('../services/socketService');

const prisma = new PrismaClient();

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getFeed(req, res) {
  const { category, radius, lat, lng } = req.query;
  const useRadius = radius && lat && lng;

  // Determine requester pastor status
  const requester = req.user ? await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isVerifiedPastor: true },
  }) : null;
  const isPastor = requester?.isVerifiedPastor === true;

  // Build visibility filter — always show own prayers regardless of visibility
  const userId = req.user.id;
  const ownPrayers = { userId };
  let visibilityFilter;
  if (isPastor) {
    visibilityFilter = {
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'PRIVATE' },
        { visibility: 'PASTOR_ONLY', pastorAccess: { some: { pastorId: userId } } },
        ownPrayers,
      ],
    };
  } else {
    visibilityFilter = {
      OR: [
        { visibility: 'PUBLIC' },
        ownPrayers,
      ],
    };
  }

  const where = { isActive: true, isAnswered: false, ...visibilityFilter };

  try {
    const all = await prisma.prayerRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, profilePhoto: true, churchName: true, location: true, latitude: true, longitude: true } },
        _count: { select: { sessions: true } },
        sessions: { select: { userId: true } },
      },
    });

    let filtered = all;

    if (useRadius) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const km = parseFloat(radius);
      filtered = all
        .filter(r => r.user.latitude != null && r.user.longitude != null)
        .map(r => ({
          ...r,
          _distanceKm: haversineKm(userLat, userLng, r.user.latitude, r.user.longitude),
        }))
        .filter(r => r._distanceKm <= km);
    }

    // Apply category filter
    if (category && category !== 'ALL') {
      filtered = filtered.filter(r => r.category === category);
    }

    // Sort by prayer count desc
    filtered.sort((a, b) => b._count.sessions - a._count.sessions);

    const format = (r, index) => {
      // Private/PastorOnly prayers are always anonymous in the feed — even to the poster
      const shouldAnonymize = r.visibility !== 'PUBLIC';
      const displayLocation = r.user?.location ? `From ${r.user.location}` : 'Undisclosed location';
      const userField = shouldAnonymize
        ? { id: null, name: null, profilePhoto: null, churchName: null }
        : { ...r.user, latitude: undefined, longitude: undefined };
      return {
        ...r,
        prayerCount: r._count.sessions,
        currentlyPrayingCount: r.sessions.filter(s => s.userId).length,
        totalPrayerCount: r._count.sessions,
        userHasPrayed: r.sessions.some(s => s.userId === userId),
        isOwner: r.userId === userId,
        isTop3: index < 3,
        rank: index + 1,
        distanceKm: r._distanceKm != null ? Math.round(r._distanceKm * 10) / 10 : null,
        isAnonymous: shouldAnonymize,
        displayLocation: shouldAnonymize ? displayLocation : null,
        sessions: undefined,
        _count: undefined,
        _distanceKm: undefined,
        user: userField,
      };
    };

    const formatted = filtered.map(format);
    res.json({ top3: formatted.slice(0, 3), rest: formatted.slice(3) });
  } catch (err) {
    console.error('getFeed error:', err);
    res.status(500).json({ error: 'Failed to get feed' });
  }
}

async function createRequest(req, res) {
  const { title, body, category, isUrgent, visibility, pastorIds } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

  const validCategories = ['GENERAL','HEALTH','FAMILY','CAREER','FINANCIAL','RELATIONSHIP','SPIRITUAL'];
  const safeCategory = validCategories.includes(category) ? category : 'GENERAL';
  const safeVisibility = ['PUBLIC','PRIVATE','PASTOR_ONLY'].includes(visibility) ? visibility : 'PUBLIC';
  const isAnonymous = safeVisibility !== 'PUBLIC';

  try {
    const request = await prisma.prayerRequest.create({
      data: {
        userId: req.user.id, title, body, category: safeCategory,
        isUrgent: Boolean(isUrgent), visibility: safeVisibility, isAnonymous,
      },
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true, location: true } } },
    });

    if (safeVisibility === 'PASTOR_ONLY' && Array.isArray(pastorIds) && pastorIds.length > 0) {
      await prisma.prayerPastorAccess.createMany({
        data: pastorIds.map(pastorId => ({ id: require('crypto').randomUUID(), prayerRequestId: request.id, pastorId })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({ ...request, currentlyPrayingCount: 0, totalPrayerCount: 0 });
  } catch (err) {
    console.error('createRequest error:', err);
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

    // Broadcast live prayer count update
    const newCount = await prisma.prayerSession.count({
      where: { prayerRequestId: session.prayerRequestId },
    });
    const io = req.app.get('io');
    if (io) io.emit('prayer_count_updated', { prayerRequestId: session.prayerRequestId, newCount });

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

async function getMyRequests(req, res) {
  try {
    const requests = await prisma.prayerRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
        _count: { select: { sessions: true } },
      },
    });
    res.json(requests.map(r => ({ ...r, totalPrayerCount: r._count.sessions, _count: undefined })));
  } catch {
    res.status(500).json({ error: 'Failed to get your prayer requests' });
  }
}

async function editRequest(req, res) {
  const { id } = req.params;
  const { title, body, visibility, isUrgent } = req.body;
  try {
    const request = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!request || request.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });
    const data = {};
    if (title) data.title = title;
    if (body !== undefined) data.body = body;
    if (visibility && ['PUBLIC', 'PRIVATE', 'PASTOR_ONLY'].includes(visibility)) {
      data.visibility = visibility;
      data.isAnonymous = visibility !== 'PUBLIC';
    }
    if (isUrgent !== undefined) data.isUrgent = Boolean(isUrgent);
    const updated = await prisma.prayerRequest.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } }, _count: { select: { sessions: true } } },
    });
    res.json({ ...updated, totalPrayerCount: updated._count.sessions });
  } catch {
    res.status(500).json({ error: 'Failed to edit prayer request' });
  }
}

async function addUpdate(req, res) {
  const { id } = req.params;
  const { updateMessage } = req.body;
  if (!updateMessage?.trim()) return res.status(400).json({ error: 'Update message required' });
  try {
    const request = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!request || request.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });
    const updated = await prisma.prayerRequest.update({
      where: { id },
      data: { updateMessage: updateMessage.trim() },
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } }, _count: { select: { sessions: true } } },
    });
    res.json({ ...updated, totalPrayerCount: updated._count.sessions });
  } catch {
    res.status(500).json({ error: 'Failed to add update' });
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
        user: { select: { id: true, name: true, profilePhoto: true, churchName: true, location: true } },
        _count: { select: { sessions: true } },
        pastorAccess: { select: { pastorId: true } },
      },
    });
    if (!request) return res.status(404).json({ error: 'Not found' });

    // Visibility check
    if (request.visibility !== 'PUBLIC') {
      const requester = req.user ? await prisma.user.findUnique({
        where: { id: req.user.id }, select: { isVerifiedPastor: true },
      }) : null;
      const isPastor = requester?.isVerifiedPastor === true;
      if (!isPastor) return res.status(403).json({ error: 'Not authorized' });
      if (request.visibility === 'PASTOR_ONLY') {
        const hasAccess = request.pastorAccess.some(a => a.pastorId === req.user.id);
        if (!hasAccess) return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const displayLocation = request.isAnonymous && request.user?.location
      ? `From ${request.user.location}` : null;

    res.json({
      ...request,
      displayLocation,
      user: request.isAnonymous
        ? { id: null, name: null, profilePhoto: null, churchName: null }
        : request.user,
      pastorAccess: undefined,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get prayer request' });
  }
}

module.exports = { getFeed, createRequest, startSession, endSession, deleteRequest, markAnswered, getAnsweredFeed, getRequest, getMyRequests, editRequest, addUpdate };
