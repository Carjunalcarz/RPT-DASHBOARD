const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { AppError } = require('./errorHandler');
const { runWithContext } = require('../utils/context');
const logger = require('../utils/logger');

// Initialize JWKS client for Supabase
// Extracts project reference from SUPABASE_URL
const getProjectRef = () => {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  // Handle formats like http://supabasekong-ref.180.232.187.222.sslip.io
  const match = url.match(/supabasekong-([^.]+)\./);
  if (match) return match[1];
  
  // Handle formats like https://ref.supabase.co
  const cloudMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return cloudMatch ? cloudMatch[1] : null;
};

const projectRef = getProjectRef();
const jwksUri = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json` : null;

const client = jwksClient({
  jwksUri: jwksUri,
  cache: true,
  rateLimit: true,
});

// Function to get signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      // Fallback to JWT_SECRET if KID not found (Legacy HS256 support)
      if (process.env.JWT_SECRET) {
        return callback(null, process.env.JWT_SECRET);
      }
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const { supabasePrisma } = require('../modules/rptas/database/prisma');

const { supabase } = require('../modules/rptas/database/supabase');

const protect = async (req, res, next) => {
  let token;
  
  // Check for token in cookies first (primary method)
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  // Fallback to Authorization header (optional, good for API clients)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // Determine verification method based on token header
  const decodedToken = jwt.decode(token, { complete: true });
  if (!decodedToken) {
     return next(new AppError('Invalid token format.', 401));
  }

  const verifyCallback = async (err, decoded) => {
    if (err) {
       logger.error(`JWT Verification Failed: ${err.message}`);
       return next(new AppError('Invalid token. Please log in again.', 401));
    }
    await processUser(req, next, decoded);
  };

  // For Self-hosted Supabase with unknown JWT Secret, we can verify via the GoTrue API directly
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.error(`Supabase Auth Verification Failed: ${error?.message || 'No user found'}`);
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    
    // We construct a mock decoded token object to maintain compatibility with existing processUser
    const decoded = {
      sub: user.id,
      email: user.email,
      role: user.role,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    };
    
    await processUser(req, next, decoded);
  } catch (err) {
    logger.error(`Auth Middleware Error: ${err.message}`);
    return next(new AppError('Authentication failed.', 401));
  }
};

async function processUser(req, next, decoded) {
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
      
      if (decoded.sub && supabasePrisma && supabasePrisma.user) {
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
      role: dbUser?.role || 'user', // Default to 'user' if DB role is missing
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
