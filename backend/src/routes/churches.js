const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const {
  create, getById, search, follow, createPost, update, getMyChurch,
} = require('../controllers/churchController');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/mine', authenticate, getMyChurch);
router.get('/search', authenticate, search);
router.get('/:id', authenticate, getById);
router.post('/', authenticate, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), create);
router.put('/:id', authenticate, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), update);
router.post('/:id/follow', authenticate, follow);
router.post('/:id/posts', authenticate, upload.single('image'), createPost);

module.exports = router;
