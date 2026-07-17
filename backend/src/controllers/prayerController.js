
const { notifyUser } = require('../services/socketService');
const { createNotification } = require('../utils/notify');

const prisma = require('../db');

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

  // Lifecycle: auto-hide requests with no activity for 30+ days (still visible
  // to the author under My Requests). Answered ones are already excluded above.
  const staleCutoff = new Date(Date.now() - 30 * 86400000);
  const where = {
    isActive: true,
    isAnswered: false,
    lastActivityAt: { gte: staleCutoff },
    ...visibilityFilter,
  };

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

    // Sort by a blend of prayer count and recent activity so fresh/bumped
    // requests surface instead of ranking purely by prayer count.
    const now = Date.now();
    filtered.forEach(r => {
      const days = (now - new Date(r.lastActivityAt || r.createdAt)) / 86400000;
      r._score = r._count.sessions + Math.max(0, 14 - days); // freshness boost, decays over ~2 weeks
    });
    filtered.sort((a, b) => b._score - a._score);

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
        _score: undefined,
        lastActivityAt: undefined,
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

    // Notify the author's active prayer partner (public requests only)
    if (safeVisibility === 'PUBLIC') {
      try {
        const partnerships = await prisma.prayerPartnership.findMany({
          where: { status: 'ACTIVE', OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }] },
          select: { user1Id: true, user2Id: true },
        });
        const io = req.app.get('io');
        const partnerIds = partnerships
          .map(p => (p.user1Id === req.user.id ? p.user2Id : p.user1Id))
          .filter(pid => pid && pid !== req.user.id);
        await Promise.all([...new Set(partnerIds)].map(pid => createNotification(io, {
          userId: pid,
          type: 'PARTNER_SHARED_PRAYER',
          message: `${request.user.name} shared a new prayer request`,
          fromUser: req.user.id,
          refId: request.id,
        })));
      } catch (e) { console.error('partner notify error:', e); }
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

    // Prayer counts as activity — keeps the request fresh in the feed
    await prisma.prayerRequest.update({ where: { id }, data: { lastActivityAt: new Date() } });

    // Notify the requester (not if praying for own request)
    if (prayerRequest.userId !== req.user.id) {
      const prayingUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true },
      });
      const io = req.app.get('io');
      const title = prayerRequest.title;

      // Batch: 3+ prayers within an hour collapse into one notification
      const hourAgo = new Date(Date.now() - 3600000);
      const recentCount = await prisma.prayerSession.count({
        where: { prayerRequestId: id, userId: { not: prayerRequest.userId }, startedAt: { gte: hourAgo } },
      });

      if (recentCount >= 3) {
        const message = `${prayingUser.name} and ${recentCount - 1} others prayed for your request "${title}"`;
        const existing = await prisma.notification.findFirst({
          where: { userId: prayerRequest.userId, type: 'SOMEONE_PRAYED', refId: id, isRead: false, createdAt: { gte: hourAgo } },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) {
          await prisma.notification.update({
            where: { id: existing.id },
            data: { message, fromUser: req.user.id, createdAt: new Date() },
          });
        } else {
          await createNotification(io, { userId: prayerRequest.userId, type: 'SOMEONE_PRAYED', message, fromUser: req.user.id, refId: id });
        }
      } else {
        await createNotification(io, {
          userId: prayerRequest.userId, type: 'SOMEONE_PRAYED',
          message: `${prayingUser.name} prayed for your request "${title}"`,
          fromUser: req.user.id, refId: id,
        });
      }

      // Keep the live "praying now" socket event for the requester's real-time UI
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
      select: { prayerStreak: true, longestPrayerStreak: true, lastPrayerDate: true, graceDaysAvailable: true },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const lastStr = user.lastPrayerDate
      ? new Date(user.lastPrayerDate).toISOString().split('T')[0]
      : null;

    let newStreak = user.prayerStreak;
    let streakIncreased = false;
    let graceUsed = false;

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
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      if (lastStr === yesterdayStr) {
        // Case C: prayed yesterday — extend streak
        newStreak = user.prayerStreak + 1;
        streakIncreased = true;
      } else if (lastStr === twoDaysAgoStr && user.graceDaysAvailable > 0) {
        // Case C2: missed exactly one day but a grace day saves the streak
        newStreak = user.prayerStreak + 1;
        streakIncreased = true;
        graceUsed = true;
      } else {
        // Case D: missed too many days — reset
        newStreak = 1;
        streakIncreased = true;
      }
    }

    const newLongest = Math.max(newStreak, user.longestPrayerStreak);
    const isRecord = newStreak > user.longestPrayerStreak;

    const userData = {
      prayerStreak: newStreak,
      longestPrayerStreak: newLongest,
      lastPrayerDate: new Date(),
    };
    if (graceUsed) {
      userData.graceDaysAvailable = { decrement: 1 };
      userData.graceDayUsedAt = new Date();
    }
    await prisma.user.update({ where: { id: req.user.id }, data: userData });

    res.json({
      durationSeconds,
      streak: {
        current: newStreak,
        longest: newLongest,
        increased: streakIncreased,
        isRecord,
        graceUsed,
        graceDaysAvailable: user.graceDaysAvailable - (graceUsed ? 1 : 0),
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

    const staleCutoff = new Date(Date.now() - 30 * 86400000);
    // Compute-on-fetch bump nudge for stale, unanswered own requests (no cron).
    // Dedup: one REQUEST_NEEDS_BUMP per request per 7 days.
    const io = req.app.get('io');
    const notifCutoff = new Date(Date.now() - 7 * 86400000);
    for (const r of requests) {
      const stale = !r.isAnswered && r.isActive && new Date(r.lastActivityAt) < staleCutoff;
      if (!stale) continue;
      const existing = await prisma.notification.findFirst({
        where: { userId: req.user.id, type: 'REQUEST_NEEDS_BUMP', refId: r.id, createdAt: { gte: notifCutoff } },
        select: { id: true },
      });
      if (!existing) {
        await createNotification(io, {
          userId: req.user.id, type: 'REQUEST_NEEDS_BUMP',
          message: `Still need prayer for "${r.title}"? Tap to bump it.`,
          refId: r.id,
        });
      }
    }

    res.json(requests.map(r => ({
      ...r,
      totalPrayerCount: r._count.sessions,
      isStale: !r.isAnswered && r.isActive && new Date(r.lastActivityAt) < staleCutoff,
      _count: undefined,
    })));
  } catch {
    res.status(500).json({ error: 'Failed to get your prayer requests' });
  }
}

// Bump a stale request back into the feed by refreshing its activity timestamp.
async function bumpRequest(req, res) {
  const { id } = req.params;
  try {
    const request = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!request || request.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });
    const updated = await prisma.prayerRequest.update({
      where: { id },
      data: { lastActivityAt: new Date() },
      include: { _count: { select: { sessions: true } } },
    });
    res.json({ ...updated, totalPrayerCount: updated._count.sessions, isStale: false, _count: undefined });
  } catch {
    res.status(500).json({ error: 'Failed to bump request' });
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
  const { testimonyMessage, isPublic } = req.body;
  try {
    const request = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!request || request.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.prayerRequest.update({
      where: { id },
      data: {
        isAnswered: true,
        answeredAt: new Date(),
        testimonyMessage: testimonyMessage?.trim() || null,
        // Default ON; only false when the author explicitly unticks "Share publicly"
        answeredIsPublic: isPublic === false ? false : true,
      },
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } }, _count: { select: { sessions: true } } },
    });

    // Notify everyone who prayed for this request (except the author)
    const io = req.app.get('io');
    const sessions = await prisma.prayerSession.findMany({
      where: { prayerRequestId: id, userId: { not: req.user.id } },
      select: { userId: true },
    });
    const prayerIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
    await Promise.all(prayerIds.map(uid => createNotification(io, {
      userId: uid,
      type: 'PRAYER_ANSWERED',
      message: `A prayer you prayed for was answered: "${updated.title}"`,
      fromUser: req.user.id,
      refId: id,
    })));

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to mark as answered' });
  }
}

// Public "Answered Prayers Wall" — only PUBLIC requests the author chose to share.
// Never exposes PRIVATE / PASTOR_ONLY answered requests (those carry no author on
// the feed anyway, but we exclude them entirely from the wall).
async function getAnsweredFeed(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  try {
    const where = { isAnswered: true, visibility: 'PUBLIC', answeredIsPublic: true };
    const [rows, total] = await Promise.all([
      prisma.prayerRequest.findMany({
        where,
        orderBy: { answeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, profilePhoto: true, churchName: true } },
          _count: { select: { sessions: true } },
        },
      }),
      prisma.prayerRequest.count({ where }),
    ]);
    const items = rows.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body,
      category: r.category,
      testimonyMessage: r.testimonyMessage,
      answeredAt: r.answeredAt,
      createdAt: r.createdAt,
      prayerCount: r._count.sessions,
      user: r.user,
    }));
    res.json({ items, page, hasMore: page * limit < total, total });
  } catch (err) {
    console.error('getAnsweredFeed error:', err);
    res.status(500).json({ error: 'Failed to get answered prayers' });
  }
}

// "Prayed for you" receipts — who prayed for the requester's own requests,
// most recent first, grouped by day. Only counts other people's prayers.
async function getPrayedForMe(req, res) {
  try {
    const since = new Date(Date.now() - 30 * 86400000); // last 30 days
    const sessions = await prisma.prayerSession.findMany({
      where: {
        startedAt: { gte: since },
        userId: { not: req.user.id },
        prayerRequest: { userId: req.user.id },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, profilePhoto: true } },
        prayerRequest: { select: { id: true, title: true } },
      },
    });

    const total = sessions.length;

    // Distinct most-recent prayers for the avatar stack / summary line
    const seen = new Set();
    const distinct = [];
    for (const s of sessions) {
      if (!s.user || seen.has(s.user.id)) continue;
      seen.add(s.user.id);
      distinct.push({ id: s.user.id, name: s.user.name, profilePhoto: s.user.profilePhoto });
    }

    // Today-only count for the "prayed for you today" headline
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const todaySessions = sessions.filter(s => new Date(s.startedAt) >= startToday);
    const todayDistinct = new Set(todaySessions.map(s => s.user?.id).filter(Boolean));

    // Group entries by day for the detail list
    const groupsMap = new Map();
    for (const s of sessions) {
      const day = new Date(s.startedAt).toISOString().slice(0, 10);
      if (!groupsMap.has(day)) groupsMap.set(day, []);
      groupsMap.get(day).push({
        userId: s.user?.id || null,
        name: s.user?.name || null,
        profilePhoto: s.user?.profilePhoto || null,
        requestId: s.prayerRequest?.id || null,
        requestTitle: s.prayerRequest?.title || null,
        prayedAt: s.startedAt,
      });
    }
    const groups = Array.from(groupsMap.entries()).map(([day, entries]) => ({ day, entries }));

    res.json({
      total,
      todayCount: todaySessions.length,
      todayPeople: todayDistinct.size,
      recentPeople: distinct.slice(0, 8),
      groups,
    });
  } catch (err) {
    console.error('getPrayedForMe error:', err);
    res.status(500).json({ error: 'Failed to get prayer receipts' });
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

module.exports = { getFeed, createRequest, startSession, endSession, deleteRequest, markAnswered, getAnsweredFeed, getPrayedForMe, getRequest, getMyRequests, bumpRequest, editRequest, addUpdate };
