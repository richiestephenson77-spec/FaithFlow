const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getFeed, createRequest, startSession, endSession, deleteRequest } = require('../controllers/prayerController');

router.get('/feed', authenticate, getFeed);
router.post('/', authenticate, createRequest);
router.post('/:id/start', authenticate, startSession);
router.post('/session/:sessionId/end', authenticate, endSession);
router.delete('/:id', authenticate, deleteRequest);

module.exports = router;
