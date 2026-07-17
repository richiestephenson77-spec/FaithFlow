const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { uploadProfile } = require('../services/cloudinaryService');

const bcrypt = require('bcryptjs');
const prisma = require('../db');
const {
  getProfile, getMe, updateProfile, follow,
  getFollowers, getFollowing, getDashboard, searchUsers, getSuggestedUsers,
} = require('../controllers/userController');

router.get('/search', authenticate, searchUsers);
router.get('/suggested', authenticate, getSuggestedUsers);
router.get('/me', authenticate, getMe);
router.get('/me/dashboard', authenticate, getDashboard);

// Weekly recap — last 7 days of activity for the recap card
router.get('/me/recap', authenticate, async (req, res) => {
  const me = req.user.id;
  const since = new Date(Date.now() - 7 * 86400000);
  try {
    const [mySessions, gratitudeCount, user, prayedForMe] = await Promise.all([
      prisma.prayerSession.findMany({
        where: { userId: me, startedAt: { gte: since } },
        select: { prayerRequest: { select: { userId: true, user: { select: { location: true } } } } },
      }),
      prisma.gratitudeEntry.count({ where: { userId: me, createdAt: { gte: since } } }),
      prisma.user.findUnique({ where: { id: me }, select: { prayerStreak: true } }),
      prisma.prayerSession.findMany({
        where: { startedAt: { gte: since }, userId: { not: me }, prayerRequest: { userId: me } },
        select: { userId: true },
      }),
    ]);

    const uniquePeople = new Set(mySessions.map(s => s.prayerRequest?.userId).filter(Boolean));
    // Author location is free-text (usually a city), so this approximates
    // "countries reached" with distinct non-empty locations.
    const places = new Set(mySessions.map(s => s.prayerRequest?.user?.location).filter(Boolean));
    const peoplePrayedForMe = new Set(prayedForMe.map(s => s.userId).filter(Boolean));

    res.json({
      periodDays: 7,
      prayersOffered: mySessions.length,
      uniquePeoplePrayedFor: uniquePeople.size,
      countriesReached: places.size,
      gratitudeEntries: gratitudeCount,
      currentStreak: user?.prayerStreak || 0,
      peoplePrayedForYou: peoplePrayedForMe.size,
    });
  } catch (err) {
    console.error('recap error:', err);
    res.status(500).json({ error: 'Failed to build recap' });
  }
});
router.put('/me', authenticate, (req, res, next) => {
  uploadProfile(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, updateProfile);

router.patch('/location', authenticate, async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude == null || longitude == null) return res.status(400).json({ error: 'latitude and longitude required' });
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Account — update name/email/password
router.patch('/account', authenticate, async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const data = {};

    if (name && name.trim()) data.name = name.trim();

    if (email && email.trim() !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (taken) return res.status(409).json({ error: 'Email already in use' });
      data.email = email.trim();
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, profilePhoto: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Account — delete
router.delete('/account', authenticate, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Notification preferences
router.patch('/notification-settings', authenticate, async (req, res) => {
  const {
    notifyPrayerStarted, notifyNewFollower, notifyPostLike, notifyPostComment,
    notifyPrayerAnswered, notifyConfessionComment, notifyStreakReminder, notifyPartnerActivity,
  } = req.body;
  try {
    const data = {};
    if (notifyPrayerStarted !== undefined) data.notifyPrayerStarted = Boolean(notifyPrayerStarted);
    if (notifyNewFollower !== undefined) data.notifyNewFollower = Boolean(notifyNewFollower);
    if (notifyPostLike !== undefined) data.notifyPostLike = Boolean(notifyPostLike);
    if (notifyPostComment !== undefined) data.notifyPostComment = Boolean(notifyPostComment);
    if (notifyPrayerAnswered !== undefined) data.notifyPrayerAnswered = Boolean(notifyPrayerAnswered);
    if (notifyConfessionComment !== undefined) data.notifyConfessionComment = Boolean(notifyConfessionComment);
    if (notifyStreakReminder !== undefined) data.notifyStreakReminder = Boolean(notifyStreakReminder);
    if (notifyPartnerActivity !== undefined) data.notifyPartnerActivity = Boolean(notifyPartnerActivity);
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        notifyPrayerStarted: true, notifyNewFollower: true, notifyPostLike: true, notifyPostComment: true,
        notifyPrayerAnswered: true, notifyConfessionComment: true, notifyStreakReminder: true, notifyPartnerActivity: true,
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Get notification preferences
router.get('/notification-settings', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        notifyPrayerStarted: true, notifyNewFollower: true, notifyPostLike: true, notifyPostComment: true,
        notifyPrayerAnswered: true, notifyConfessionComment: true, notifyStreakReminder: true, notifyPartnerActivity: true,
      },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Prayer reminder settings
router.patch('/prayer-reminder', authenticate, async (req, res) => {
  const { enabled, time } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { prayerReminderEnabled: Boolean(enabled), prayerReminderTime: time || null },
      select: { prayerReminderEnabled: true, prayerReminderTime: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to save reminder' });
  }
});

router.get('/prayer-reminder', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { prayerReminderEnabled: true, prayerReminderTime: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to get reminder settings' });
  }
});

router.get('/:id', authenticate, getProfile);
router.post('/:id/follow', authenticate, follow);
router.get('/:id/followers', authenticate, getFollowers);
router.get('/:id/following', authenticate, getFollowing);

module.exports = router;
