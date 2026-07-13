const router = require('express').Router();
const { signup, login, forgotPassword, resetPassword } = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/authRateLimit');

router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

module.exports = router;
