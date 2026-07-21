const prisma = require('../db');

// Gate admin-only routes. Assumes `authenticate` ran first (req.user set).
async function requireAdmin(req, res, next) {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isAdmin: true } });
    if (!u || !u.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = { requireAdmin };
