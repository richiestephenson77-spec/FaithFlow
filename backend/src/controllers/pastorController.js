const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPastors(req, res) {
  try {
    const pastors = await prisma.user.findMany({
      where: { isVerifiedPastor: true },
      select: { id: true, name: true, profilePhoto: true, pastorTitle: true, pastorChurch: true, pastorBio: true },
    });
    res.json(pastors);
  } catch {
    res.status(500).json({ error: 'Failed to get pastors' });
  }
}

async function submitPrayerRequest(req, res) {
  const { pastorId } = req.params;
  const { request, isAnonymous } = req.body;
  if (!request?.trim()) return res.status(400).json({ error: 'Request required' });
  try {
    const pastor = await prisma.user.findUnique({ where: { id: pastorId, isVerifiedPastor: true } });
    if (!pastor) return res.status(404).json({ error: 'Pastor not found' });
    const pr = await prisma.pastorPrayerRequest.create({
      data: { userId: req.user.id, pastorId, request: request.trim(), isAnonymous: Boolean(isAnonymous) },
    });
    res.status(201).json(pr);
  } catch {
    res.status(500).json({ error: 'Failed to submit request' });
  }
}

async function getMyRequests(req, res) {
  try {
    const requests = await prisma.pastorPrayerRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { pastor: { select: { id: true, name: true, profilePhoto: true, pastorTitle: true } } },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function getPastorDashboard(req, res) {
  if (!req.user.isVerifiedPastor) return res.status(403).json({ error: 'Not a pastor' });
  try {
    const requests = await prisma.pastorPrayerRequest.findMany({
      where: { pastorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
    res.json(requests.map(r => ({
      ...r,
      user: r.isAnonymous ? { id: null, name: 'Anonymous Believer', profilePhoto: null } : r.user,
    })));
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function respondToRequest(req, res) {
  const { id } = req.params;
  const { response, status } = req.body;
  try {
    const pr = await prisma.pastorPrayerRequest.findUnique({ where: { id } });
    if (!pr || pr.pastorId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    const updated = await prisma.pastorPrayerRequest.update({
      where: { id },
      data: {
        response: response || pr.response,
        status: status || 'RESPONDED',
        respondedAt: new Date(),
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { getPastors, submitPrayerRequest, getMyRequests, getPastorDashboard, respondToRequest };
