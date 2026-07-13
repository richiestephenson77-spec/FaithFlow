const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getConfessions, getConfession, createConfession, getMyConfessions, heart, getComments, addComment } = require('../controllers/confessionController');

router.get('/', authenticate, getConfessions);
router.post('/', authenticate, createConfession);
// Must be registered before '/:id' so it isn't captured as an id param.
// Authorship is scoped to req.user.id inside the handler — no id is accepted.
router.get('/mine', authenticate, getMyConfessions);
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, addComment);
router.post('/:id/heart', authenticate, heart);
router.get('/:id', authenticate, getConfession);

module.exports = router;
