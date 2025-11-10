const rateLimit = require('express-rate-limit');

/**
 * Rate limiter to protect against brute-force attacks
 * on sensitive endpoints like login.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per `windowMs`
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  loginLimiter,
};
