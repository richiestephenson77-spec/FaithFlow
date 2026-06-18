const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getConfessions, createConfession, encourage, getComments, addComment } = require('../controllers/confessionController');

router.get('/', authenticate, getConfessions);
router.post('/', authenticate, createConfession);
router.post('/:id/encourage', authenticate, encourage);
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, addComment);

module.exports = router;
