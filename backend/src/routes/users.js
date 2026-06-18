const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { uploadProfile } = require('../services/cloudinaryService');
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
router.get('/:id', authenticate, getProfile);
router.post('/:id/follow', authenticate, follow);
router.get('/:id/followers', authenticate, getFollowers);
router.get('/:id/following', authenticate, getFollowing);

module.exports = router;
