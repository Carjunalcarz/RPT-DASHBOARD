const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../middleware/authIdentity');
const { AppError } = require('../../middleware/errorHandler');
const requireSuperAdmin = require('../rbac/requireSuperAdmin');

/**
 * Inline validate runner — uses express-validator v7 API directly so we
 * don't depend on the project's older validate.js (which references
 * err.param — replaced by err.path in v7).
 */
function runChecks(...checks) {
  return async (req, res, next) => {
    for (const c of checks) {
      const r = await c.run(req);
      if (!r.isEmpty()) break;
    }
    const errs = validationResult(req);
    if (errs.isEmpty()) return next();
    const issues = errs.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return next(new AppError(`Validation failed: ${JSON.stringify(issues)}`, 400));
  };
}

const IS_DEV = process.env.NODE_ENV !== 'production';

// Rate-limit settings differ by environment:
//   - Production: tight (10 login attempts / 15 min, 20 registers / hour)
//                 to deter password brute-force and signup abuse.
//   - Development: loose (effectively off) so iterating during builds
//                  doesn't lock the developer out.
// Service-key requests (x-api-key matches API_ACCESS_KEY) always bypass —
// internal scripts shouldn't trip a per-IP counter.
function skipForServiceOrDev(req) {
  if (IS_DEV) return true;
  const key = req.headers['x-api-key'];
  if (key && process.env.API_ACCESS_KEY && key === process.env.API_ACCESS_KEY) {
    return true;
  }
  return false;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForServiceOrDev,
  message: {
    status: 'fail',
    message: 'Too many login attempts from this IP. Try again in 15 minutes.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_DEV ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForServiceOrDev,
  message: {
    status: 'fail',
    message: 'Too many registration attempts from this IP. Try again later.',
  },
});

// ----- Validation chains -----

const registerValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isString().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('fullName').trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 200 }).withMessage('Full name too long'),
  body('role').optional().isIn(['admin', 'user'])
    .withMessage('role must be "admin" or "user"'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

function createAuthRoutes({ authController: c }) {
  const r = Router();

  // Public
  r.post('/register', registerLimiter, runChecks(...registerValidators), c.register);
  r.post('/login',    loginLimiter,    runChecks(...loginValidators),    c.login);
  r.post('/refresh',                                                     c.refresh);

  // Authenticated
  r.post('/logout', authenticate, c.logout);
  r.get ('/me',     authenticate, c.me);

  // Admin-only — list / get / delete Supabase auth users.
  // requireSuperAdmin bypasses for service-key requests, so the dashboard's
  // apiClient (which always sends x-api-key) is allowed automatically.
  r.get   ('/users',     authenticate, requireSuperAdmin, c.listUsers);
  r.get   ('/users/:id', authenticate, requireSuperAdmin, c.getUser);
  r.delete('/users/:id', authenticate, requireSuperAdmin, c.deleteUser);

  return r;
}

module.exports = createAuthRoutes;
