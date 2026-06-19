const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getConfessions, getConfession, createConfession, heart, getComments, addComment } = require('../controllers/confessionController');

router.get('/', authenticate, getConfessions);
router.post('/', authenticate, createConfession);
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, addComment);
router.post('/:id/heart', authenticate, heart);
router.get('/:id', authenticate, getConfession);

module.exports = router;
