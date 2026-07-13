const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { uploadAudio } = require('../services/cloudinaryService');
const { getConversations, startConversation, getMessages, sendMessage, sendAudioMessage, markRead, getTotalUnread, setReaction } = require('../controllers/messageController');

router.get('/unread', authenticate, getTotalUnread);
router.get('/conversations', authenticate, getConversations);
router.post('/conversations', authenticate, startConversation);
router.get('/conversations/:conversationId', authenticate, getMessages);
router.post('/conversations/:conversationId', authenticate, sendMessage);
router.post('/conversations/:conversationId/audio', authenticate, (req, res, next) => {
  uploadAudio(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, sendAudioMessage);
router.put('/conversations/:conversationId/read', authenticate, markRead);
router.patch('/:messageId/reaction', authenticate, setReaction);

module.exports = router;
