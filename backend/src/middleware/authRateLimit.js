const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Brute-force protection for auth endpoints (login / signup / password reset).
// - 10 FAILED attempts per client IP per 15 minutes; successful requests
//   (status < 400) are not counted, so normal logins are never throttled.
// - Behind Railway's proxy, req.ip is the proxy address, so we derive the real
//   client IP from X-Forwarded-For ourselves. Keeping IP resolution inside this
//   middleware avoids changing the global `trust proxy` / CORS setup.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const fwd = req.headers['x-forwarded-for'];
    const ip = (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.ip || 'unknown';
    // Normalize (masks IPv6 to a subnet so v6 users can't trivially bypass)
    return ipKeyGenerator(ip);
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many attempts, please try again later.' });
  },
});

module.exports = { authRateLimiter };
