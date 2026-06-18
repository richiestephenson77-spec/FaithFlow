const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getConversations, startConversation, getMessages, sendMessage, markRead, getTotalUnread } = require('../controllers/messageController');

router.get('/unread', authenticate, getTotalUnread);
router.get('/conversations', authenticate, getConversations);
router.post('/conversations', authenticate, startConversation);
router.get('/conversations/:conversationId', authenticate, getMessages);
router.post('/conversations/:conversationId', authenticate, sendMessage);
router.put('/conversations/:conversationId/read', authenticate, markRead);

module.exports = router;
