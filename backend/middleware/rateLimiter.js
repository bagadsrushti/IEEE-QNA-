const rateLimit = require('express-rate-limit');

// Rate limit for public question submissions (accommodates shared campus Wi-Fi NAT)
const questionSubmissionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500, // max 500 submissions per window per IP/NAT
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many question submissions from this connection. Please wait a few minutes before submitting another question.'
  }
});

// Rate limit for admin authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
});

module.exports = { questionSubmissionLimiter, authLimiter };
