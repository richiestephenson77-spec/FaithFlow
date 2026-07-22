const prisma = require('../db');

// Hard-remove timed-vanish messages past their expiresAt, grouped by
// conversation so each open thread is told over the socket. Runs on a plain
// setInterval — a long-lived Node process on Railway keeps it alive, so no
// external cron/scheduler is needed. Event-based ("after_seen") messages carry
// no expiresAt and are handled by the on-leave sweep instead.
async function sweepExpired(io) {
  try {
    const expired = await prisma.message.findMany({
      where: { isVanish: true, expiresAt: { not: null, lte: new Date() } },
      select: { id: true, conversationId: true },
    });
    if (!expired.length) return 0;

    const ids = expired.map(e => e.id);
    await prisma.message.deleteMany({ where: { id: { in: ids } } });

    if (io) {
      const byConvo = new Map();
      for (const e of expired) {
        if (!byConvo.has(e.conversationId)) byConvo.set(e.conversationId, []);
        byConvo.get(e.conversationId).push(e.id);
      }
      for (const [conversationId, cids] of byConvo) {
        io.to(`conversation:${conversationId}`).emit('messages_vanished', { conversationId, ids: cids });
      }
    }
    return ids.length;
  } catch (err) {
    console.error('vanish sweep error:', err);
    return 0;
  }
}

function startVanishJob(io, intervalMs = 2 * 60 * 1000) {
  sweepExpired(io); // run once at startup to clear anything already past due
  const timer = setInterval(() => sweepExpired(io), intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { startVanishJob, sweepExpired };
