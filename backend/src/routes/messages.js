const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { uploadAudio, uploadMessageImage } = require('../services/cloudinaryService');
const { getConversations, startConversation, getMessages, sendMessage, sendAudioMessage, sendImageMessage, markRead, getTotalUnread, setReaction, unsendMessage, sharePrayerRequest, updateConversationSettings, getConversationMedia } = require('../controllers/messageController');

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
router.post('/conversations/:conversationId/image', authenticate, (req, res, next) => {
  uploadMessageImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, sendImageMessage);
router.post('/conversations/:conversationId/share-prayer', authenticate, sharePrayerRequest);
router.patch('/conversations/:conversationId/settings', authenticate, updateConversationSettings);
router.get('/conversations/:conversationId/media', authenticate, getConversationMedia);
router.put('/conversations/:conversationId/read', authenticate, markRead);
router.patch('/:messageId/reaction', authenticate, setReaction);
router.patch('/:messageId/unsend', authenticate, unsendMessage);

module.exports = router;
