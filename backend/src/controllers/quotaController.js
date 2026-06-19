
const prisma = require('../db');

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function getOrCreateLog(userId, target) {
  const date = todayStr();
  return prisma.dailyQuotaLog.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date, target, completed: 0, isComplete: false },
  });
}

async function getToday(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { dailyPrayerQuota: true },
    });
    const log = await getOrCreateLog(req.user.id, user.dailyPrayerQuota);
    res.json(log);
  } catch (err) {
    console.error('getToday error:', err);
    res.status(500).json({ error: 'Failed' });
  }
}

async function updateSettings(req, res) {
  const target = parseInt(req.body.target);
  if (!target || target < 1 || target > 100) return res.status(400).json({ error: 'Invalid target' });
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { dailyPrayerQuota: target },
      select: { dailyPrayerQuota: true },
    });
    // Also update today's log if it exists and hasn't started
    const date = todayStr();
    const log = await prisma.dailyQuotaLog.findUnique({
      where: { userId_date: { userId: req.user.id, date } },
    });
    if (log && log.completed === 0) {
      await prisma.dailyQuotaLog.update({
        where: { userId_date: { userId: req.user.id, date } },
        data: { target },
      });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
}

async function getQueue(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { dailyPrayerQuota: true },
    });
    const n = user.dailyPrayerQuota;

    // Get IDs already prayed for today
    const todaySessions = await prisma.prayerSession.findMany({
      where: {
        userId: req.user.id,
        startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      select: { prayerRequestId: true },
    });
    const prayedIds = todaySessions.map(s => s.prayerRequestId).filter(Boolean);

    // Fetch urgent first, then regular
    const urgent = await prisma.prayerRequest.findMany({
      where: {
        isUrgent: true,
        isAnswered: false,
        userId: { not: req.user.id },
        id: { notIn: prayedIds },
      },
      include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
      orderBy: { createdAt: 'desc' },
      take: n,
    });

    let queue = [...urgent];
    if (queue.length < n) {
      const regular = await prisma.prayerRequest.findMany({
        where: {
          isUrgent: false,
          isAnswered: false,
          userId: { not: req.user.id },
          id: { notIn: [...prayedIds, ...queue.map(r => r.id)] },
        },
        include: { user: { select: { id: true, name: true, profilePhoto: true, churchName: true } } },
        orderBy: { createdAt: 'desc' },
        take: n - queue.length,
      });
      queue = [...queue, ...regular];
    }

    // Shuffle
    queue = queue.sort(() => Math.random() - 0.5).slice(0, n);
    res.json(queue);
  } catch (err) {
    console.error('getQueue error:', err);
    res.status(500).json({ error: 'Failed' });
  }
}

async function completePrayer(req, res) {
  const { prayerRequestId } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { dailyPrayerQuota: true, prayerWarriorBadge: true, totalPeoplesPrayedFor: true },
    });

    const date = todayStr();
    const log = await getOrCreateLog(req.user.id, user.dailyPrayerQuota);
    const newCompleted = Math.min(log.completed + 1, log.target);
    const nowComplete = newCompleted >= log.target;

    const updatedLog = await prisma.dailyQuotaLog.update({
      where: { userId_date: { userId: req.user.id, date } },
      data: { completed: newCompleted, isComplete: nowComplete },
    });

    // Badge earned for first-ever completion
    let badgeEarned = false;
    const updates = { totalPeoplesPrayedFor: { increment: 1 } };
    if (nowComplete && !user.prayerWarriorBadge) {
      updates.prayerWarriorBadge = true;
      updates.prayerWarriorEarnedAt = new Date();
      badgeEarned = true;
    }
    await prisma.user.update({ where: { id: req.user.id }, data: updates });

    res.json({
      completed: newCompleted,
      target: log.target,
      isComplete: nowComplete,
      badgeEarned,
    });
  } catch (err) {
    console.error('completePrayer error:', err);
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { getToday, updateSettings, getQueue, completePrayer };
