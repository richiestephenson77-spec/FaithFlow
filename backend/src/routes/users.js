const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { uploadProfile } = require('../services/cloudinaryService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  getProfile, getMe, updateProfile, follow,
  getFollowers, getFollowing, getDashboard, searchUsers,
} = require('../controllers/userController');

router.get('/search', authenticate, searchUsers);
router.get('/me', authenticate, getMe);
router.get('/me/dashboard', authenticate, getDashboard);
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
    await prisma.user.update({
      where: { id: req.user.id },
      data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save location' });
  }
});
router.get('/:id', authenticate, getProfile);
router.post('/:id/follow', authenticate, follow);
router.get('/:id/followers', authenticate, getFollowers);
router.get('/:id/following', authenticate, getFollowing);

module.exports = router;
