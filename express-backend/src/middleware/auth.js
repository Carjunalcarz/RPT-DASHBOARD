const { AppError } = require('./errorHandler');
const { runWithContext } = require('../utils/context');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { supabasePrisma } = require('../modules/rptas/database/prisma');

// Implement rate limiting for API access
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const protect = async (req, res, next) => {
  // Apply rate limiter manually in middleware
  apiLimiter(req, res, async () => {
    let apiKey;
    
    // Check for API key in custom header or Authorization header
    if (req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      apiKey = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      // Support for Swagger UI 'cookieAuth'
      apiKey = req.cookies.access_token;
    }

    if (!apiKey) {
      return next(new AppError('You are not authorized! Please provide a valid API key.', 401));
    }

    // Validate API key against environment variable
    const validApiKey = process.env.API_ACCESS_KEY;
    if (!validApiKey) {
      logger.error('API_ACCESS_KEY is not configured in the environment variables.');
      return next(new AppError('Server configuration error.', 500));
    }

    if (apiKey !== validApiKey) {
      logger.warn(`Invalid API key attempt from IP: ${req.ip || req.connection.remoteAddress}`);
      return next(new AppError('Invalid API key.', 401));
    }

    // API Key is valid. Construct a mock user object to maintain backward compatibility.
    const decoded = {
      sub: 'api-user',
      email: 'api@system.local',
      role: 'admin', // Grant admin role to the API key by default
      user_metadata: { name: 'API System User' },
      app_metadata: {}
    };
    
    return await processUser(req, res, next, decoded);
  });
};

async function processUser(req, res, next, decoded) {
    // Fetch user role from database
    let dbUser = null;
    try {
      // decoded.sub is the user ID in Supabase JWTs
      // Only attempt to fetch if supabasePrisma is available and connected
      // However, Prisma might throw if connection fails.
      // We should wrap in try-catch which is already done.
      // The error "Invalid `supabasePrisma.user.findUnique()` invocation" suggests `supabasePrisma.user` might be undefined
      // OR the connection is failing. The log says "Can't reach database server".
      
      // If we can't reach the DB, we should still allow the request if the token is valid,
      // but maybe with limited roles (or just the roles in the token).
      // Supabase JWTs usually contain role info.
      
      if (decoded.sub && decoded.sub !== 'api-user' && supabasePrisma && supabasePrisma.user) {
        dbUser = await supabasePrisma.user.findUnique({
          where: { id: decoded.sub },
          select: {
            role: true,
            email: true,
            municipalityCode: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
          }
        });
      }
    } catch (err) {
      // Log warning but don't block request if token is valid
      logger.warn(`Failed to fetch user details from DB (using token data only): ${err.message}`);
    }

    // Merge DB user info if available, otherwise rely on token
    // IMPORTANT: Supabase JWT might have a 'role' claim (usually 'authenticated'),
    // but our app expects 'admin' or 'user'.
    // If DB fetch failed or user not in DB, dbUser is null.
    // If dbUser is null, we default to 'user' role unless the token explicitly says otherwise (unlikely for app roles).
    
    req.user = { 
      ...decoded, 
      id: decoded.sub, // Ensure ID is accessible as req.user.id
      role: dbUser?.role || decoded?.role || 'user', // Default to decoded role or 'user' if DB role is missing
      email: decoded?.email || dbUser?.email || null,
      municipalityCode: dbUser?.municipalityCode || null,
      fullName: dbUser?.fullName || null,
      displayName: dbUser?.displayName || null,
      avatarUrl: dbUser?.avatarUrl || null,
    };
    
    // Pass control to next middleware with context
    runWithContext({ user: req.user, ip: req.ip || req.connection.remoteAddress }, () => {
      next();
    });
}

protect.restrictTo = (...roles) => {
  return (req, res, next) => {
    const allowed = roles.map((r) => String(r).toLowerCase());
    const userRole = String(req.user?.role || '').toLowerCase();
    if (!allowed.includes(userRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = protect;
