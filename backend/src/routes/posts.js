const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { uploadPost } = require('../services/cloudinaryService');
const {
  getFeed, getUserPosts, createPost, likePost,
  addComment, getComments, deletePost,
} = require('../controllers/postController');

router.get('/', authenticate, getFeed);
router.get('/user/:userId', authenticate, getUserPosts);
router.post('/', authenticate, (req, res, next) => {
  uploadPost(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, createPost);
router.post('/:id/like', authenticate, likePost);
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, addComment);
router.delete('/:id', authenticate, deletePost);

module.exports = router;
