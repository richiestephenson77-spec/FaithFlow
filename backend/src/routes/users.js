const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const {
  getProfile, getMe, updateProfile, follow,
  getFollowers, getFollowing, getDashboard, searchUsers,
} = require('../controllers/userController');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/search', authenticate, searchUsers);
router.get('/me', authenticate, getMe);
router.get('/me/dashboard', authenticate, getDashboard);
router.put('/me', authenticate, upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 },
]), updateProfile);
router.get('/:id', authenticate, getProfile);
router.post('/:id/follow', authenticate, follow);
router.get('/:id/followers', authenticate, getFollowers);
router.get('/:id/following', authenticate, getFollowing);

module.exports = router;
