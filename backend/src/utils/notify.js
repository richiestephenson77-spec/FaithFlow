const prisma = require('../db');
const { notifyUser } = require('../services/socketService');

// Maps each notification type to the User boolean preference that gates it.
// Types with no entry are always delivered.
const PREF_BY_TYPE = {
  PRAYER_STARTED: 'notifyPrayerStarted',
  SOMEONE_PRAYED: 'notifyPrayerStarted',
  NEW_FOLLOWER: 'notifyNewFollower',
  POST_LIKE: 'notifyPostLike',
  POST_COMMENT: 'notifyPostComment',
  PRAYER_ANSWERED: 'notifyPrayerAnswered',
  CONFESSION_COMMENT: 'notifyConfessionComment',
  STREAK_AT_RISK: 'notifyStreakReminder',
  PARTNER_SHARED_PRAYER: 'notifyPartnerActivity',
};

// Create a persisted notification (respecting the recipient's per-type setting)
// and push it over the socket. Returns the created row, or null if suppressed.
async function createNotification(io, { userId, type, message, fromUser = null, refId = null }) {
  try {
    const prefKey = PREF_BY_TYPE[type];
    if (prefKey) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { [prefKey]: true } });
      if (u && u[prefKey] === false) return null;
    }
    const notif = await prisma.notification.create({
      data: { userId, type, message, fromUser, refId },
    });
    if (io) notifyUser(io, userId, 'notification', { id: notif.id, type, message, fromUser, refId, createdAt: notif.createdAt });
    return notif;
  } catch (err) {
    console.error('createNotification error:', err);
    return null;
  }
}

module.exports = { createNotification, PREF_BY_TYPE };
