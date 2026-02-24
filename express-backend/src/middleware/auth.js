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
  // Handle formats like https://ref.supabase.co
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
};

const projectRef = getProjectRef();
const jwksUri = projectRef ? `https://${projectRef}.supabase.co/auth/v1/.well-known/jwks.json` : null;

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

const { supabasePrisma } = require('../database/prisma');

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

  // If alg is ES256, use JWKS. If HS256, use Secret.
  if (decodedToken.header.alg === 'ES256' && jwksUri) {
     jwt.verify(token, getKey, { algorithms: ['ES256'] }, verifyCallback);
  } else {
     // Fallback to HS256 (Legacy)
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       await processUser(req, next, decoded);
     } catch (err) {
       logger.error(`JWT Verification (HS256) Failed: ${err.message}`);
       return next(new AppError('Invalid token. Please log in again.', 401));
     }
  }
};

async function processUser(req, next, decoded) {
    // Fetch user role from database
    let dbUser = null;
    try {
      // decoded.sub is the user ID in Supabase JWTs
      if (decoded.sub) {
        dbUser = await supabasePrisma.user.findUnique({
          where: { id: decoded.sub },
          select: { role: true, email: true }
        });
      }
    } catch (err) {
      logger.warn(`Failed to fetch user details from DB: ${err.message}`);
    }

    req.user = { ...decoded, ...dbUser };
    
    runWithContext({ user: req.user, ip: req.ip || req.connection.remoteAddress }, () => {
      next();
    });
}

module.exports = protect;
