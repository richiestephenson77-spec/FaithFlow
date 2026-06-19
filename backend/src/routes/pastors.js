const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getPastors, submitPrayerRequest, getMyRequests, getPastorDashboard, respondToRequest, getPrivatePrayers } = require('../controllers/pastorController');

router.get('/', authenticate, getPastors);
router.get('/my-requests', authenticate, getMyRequests);
router.get('/dashboard', authenticate, getPastorDashboard);
router.post('/:pastorId/pray', authenticate, submitPrayerRequest);
router.put('/requests/:id/respond', authenticate, respondToRequest);
router.get('/private-prayers', authenticate, getPrivatePrayers);

module.exports = router;
