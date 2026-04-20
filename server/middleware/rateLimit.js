const rateLimit = require('express-rate-limit');

const tooManyAttempts = { error: 'Too many attempts, please try again later.' };

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
});

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
});

const genericApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
});

module.exports = { authLimiter, publicFormLimiter, genericApiLimiter };
