const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const {
  getFeed, getUserPosts, createPost, likePost,
  addComment, getComments, deletePost,
} = require('../controllers/postController');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

router.get('/', authenticate, getFeed);
router.get('/user/:userId', authenticate, getUserPosts);
router.post('/', authenticate, upload.array('media', 10), createPost);
router.post('/:id/like', authenticate, likePost);
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, addComment);
router.delete('/:id', authenticate, deletePost);

module.exports = router;
