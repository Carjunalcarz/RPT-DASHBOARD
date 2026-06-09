/**
 * Identity middleware (RBAC-ready).
 *
 * Resolves req.user from a Supabase JWT and falls back to the legacy shared
 * API key for service-to-service calls. The old src/middleware/auth.js is
 * kept untouched so existing routes that depend on its mock-Admin behaviour
 * keep working; new routes should prefer `authenticate` from here.
 *
 * Verification order:
 *   1. `x-api-key: <API_ACCESS_KEY>`     -> req.isServiceRequest = true
 *   2. `Authorization: Bearer <jwt>`     -> verify via SUPABASE_JWT_SECRET (HS256)
 *                                            or JWKS_URL (RS256/ES256), then
 *                                            load profile from `users` table.
 *   3. Cookie `access_token`             -> same JWT path.
 *
 * Env:
 *   API_ACCESS_KEY        legacy/service key (already in use)
 *   SUPABASE_JWT_SECRET   HS256 shared secret (preferred for older projects)
 *   SUPABASE_JWKS_URL     explicit JWKS endpoint (overrides derivation)
 *   SUPABASE_URL          if set, JWKS is derived as `${URL}/auth/v1/.well-known/jwks.json`
 *
 * If neither SUPABASE_JWT_SECRET nor a JWKS source is configured, JWT auth is
 * disabled and only the API key path will succeed.
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const rateLimit = require('express-rate-limit');
const { AppError } = require('./errorHandler');
const { runWithContext } = require('../utils/context');
const logger = require('../utils/logger');
const { supabasePrisma } = require('../modules/rptas/database/prisma');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const JWKS_URL = (() => {
  if (process.env.SUPABASE_JWKS_URL) return process.env.SUPABASE_JWKS_URL;
  if (process.env.SUPABASE_URL) {
    return `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
  }
  return null;
})();

const jwks = JWKS_URL
  ? jwksClient({ jwksUri: JWKS_URL, cache: true, cacheMaxAge: 10 * 60 * 1000, rateLimit: true })
  : null;

function getJwksKey(header, cb) {
  if (!jwks) return cb(new Error('JWKS not configured'));
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return cb(err);
    cb(null, key.getPublicKey());
  });
}

function verifyJwt(token) {
  return new Promise((resolve, reject) => {
    const secret = process.env.SUPABASE_JWT_SECRET;

    const tryRs = () => {
      if (!jwks) return reject(new Error('No RS256/JWKS source configured'));
      jwt.verify(token, getJwksKey, { algorithms: ['RS256', 'ES256'] }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    };

    if (secret) {
      jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
          // HS256 didn't verify — token may be RS-signed; fall back if we can.
          if (jwks) return tryRs();
          return reject(err);
        }
        resolve(decoded);
      });
    } else {
      tryRs();
    }
  });
}

function looksLikeJwt(token) {
  return typeof token === 'string' && token.split('.').length === 3;
}

const SERVICE_USER = Object.freeze({
  id: 'service-account',
  sub: 'service-account',
  email: 'service@system.local',
  role: 'service',
  isService: true,
});

async function loadUserProfile(userId) {
  if (!userId || !supabasePrisma?.user) return null;
  try {
    return await supabasePrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        municipalityCode: true,
        fullName: true,
        contactNo: true,
      },
    });
  } catch (err) {
    logger.warn(`Failed to load user profile ${userId}: ${err.message}`);
    return null;
  }
}

function extractToken(req) {
  const xKey = req.headers['x-api-key'];
  const auth = req.headers.authorization;
  const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const cookieTok = req.cookies?.access_token || null;

  // Prefer a real user JWT (a 3-part token) over the shared API key. Browser
  // clients send BOTH a Supabase session JWT and the fallback x-api-key on
  // every request; if we matched the key first, every authenticated user would
  // collapse into the service account and RBAC (/me) would hand back the full
  // super-admin module set. Service-to-service callers send only the key, so
  // they still fall through to the key path below.
  if (bearer && looksLikeJwt(bearer)) return { value: bearer, source: 'bearer' };
  if (cookieTok && looksLikeJwt(cookieTok)) return { value: cookieTok, source: 'cookie' };

  if (xKey) return { value: xKey, source: 'x-api-key' };
  if (bearer) return { value: bearer, source: 'bearer' };
  if (cookieTok) return { value: cookieTok, source: 'cookie' };

  return null;
}

const authenticate = async (req, res, next) => {
  // CORS preflight requests never carry auth headers — the cors() middleware
  // upstream is supposed to short-circuit OPTIONS, but if it isn't installed
  // before this route (e.g. plugin routes mounted before app.use(cors())),
  // a preflight would otherwise 401 and the browser would never send the
  // real request. Always let OPTIONS through.
  if (req.method === 'OPTIONS') return next();

  apiLimiter(req, res, async () => {
    try {
      const serviceKey = process.env.API_ACCESS_KEY;
      const token = extractToken(req);

      if (!token) {
        return next(new AppError('Authentication required', 401));
      }

      // Service key path — accept via x-api-key or Bearer (legacy).
      if (
        serviceKey &&
        token.value === serviceKey &&
        (token.source === 'x-api-key' || token.source === 'bearer')
      ) {
        req.user = { ...SERVICE_USER };
        req.isServiceRequest = true;
        return runWithContext({ user: req.user, ip: req.ip }, () => next());
      }

      // From here on, only JWTs are accepted.
      if (!looksLikeJwt(token.value)) {
        return next(new AppError('Invalid credentials', 401));
      }

      let decoded;
      try {
        decoded = await verifyJwt(token.value);
      } catch (err) {
        logger.warn(`JWT verification failed (${token.source}): ${err.message}`);
        return next(new AppError('Invalid or expired token', 401));
      }

      const dbUser = await loadUserProfile(decoded.sub);
      req.user = {
        ...decoded,
        id: decoded.sub,
        email: dbUser?.email || decoded.email || null,
        username: dbUser?.username || null,
        role: dbUser?.role || 'user',
        municipalityCode: dbUser?.municipalityCode || null,
        fullName: dbUser?.fullName || null,
        displayName: dbUser?.displayName || null,
        avatarUrl: dbUser?.avatarUrl || null,
        isService: false,
      };
      req.isServiceRequest = false;

      runWithContext({ user: req.user, ip: req.ip }, () => next());
    } catch (err) {
      next(err);
    }
  });
};

module.exports = { authenticate, SERVICE_USER };