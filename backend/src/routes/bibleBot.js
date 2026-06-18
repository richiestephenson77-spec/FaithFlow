const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { chat, getHistory, clearHistory } = require('../controllers/bibleBotController');

router.get('/history', authenticate, getHistory);
router.post('/chat', authenticate, chat);
router.delete('/history', authenticate, clearHistory);

module.exports = router;
