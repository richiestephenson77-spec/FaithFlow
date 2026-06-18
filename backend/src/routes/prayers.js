const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getFeed, createRequest, startSession, endSession, deleteRequest, markAnswered, getAnsweredFeed, getRequest } = require('../controllers/prayerController');

router.get('/feed', authenticate, getFeed);
router.get('/answered', authenticate, getAnsweredFeed);
router.post('/', authenticate, createRequest);
router.get('/:id', authenticate, getRequest);
router.post('/:id/start', authenticate, startSession);
router.post('/:id/answered', authenticate, markAnswered);
router.post('/session/:sessionId/end', authenticate, endSession);
router.delete('/:id', authenticate, deleteRequest);

module.exports = router;
