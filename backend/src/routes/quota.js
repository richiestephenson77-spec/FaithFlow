const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getToday, updateSettings, getQueue, completePrayer } = require('../controllers/quotaController');

router.get('/today', authenticate, getToday);
router.post('/settings', authenticate, updateSettings);
router.get('/queue', authenticate, getQueue);
router.post('/complete-prayer', authenticate, completePrayer);

module.exports = router;
