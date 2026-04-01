const { supabasePrisma } = require('../modules/rptas/database/prisma');
const logger = require('../utils/logger');

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) {
    return next();
  }

  // Only apply to mutation methods
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const method = req.method;
  const path = req.path;
  const userId = req.user ? req.user.id : null;

  try {
    // Check if key exists
    const existingKeys = await supabasePrisma.$queryRaw`
      SELECT * FROM "idempotency_keys" WHERE key = ${key}
    `;

    const existingKey = existingKeys[0];

    if (existingKey) {
      // Check if locked (processing)
      if (existingKey.locked_at) {
         // Check if it's stale (e.g. > 60s)
         const lockedAt = new Date(existingKey.locked_at);
         const now = new Date();
         if (now - lockedAt > 60000) {
             // Stale lock, maybe server crashed. Allow retry.
             await supabasePrisma.$executeRaw`
                UPDATE "idempotency_keys" 
                SET locked_at = NOW(), created_at = NOW() 
                WHERE key = ${key}
             `;
             // Continue to process as if new attempt
             req.idempotencyLocked = true;
         } else {
             logger.warn(`Idempotency key ${key} is locked. Request in progress.`);
             return res.status(409).json({
                error: 'Conflict',
                message: 'Request is currently being processed.'
             });
         }
      } else if (existingKey.response_status) {
        // Return stored response
        logger.info(`Returning cached response for idempotency key ${key}`);
        return res.status(existingKey.response_status).json(existingKey.response_body);
      } else {
         // Exists but no response and not locked? Treat as retry.
          await supabasePrisma.$executeRaw`
            UPDATE "idempotency_keys" 
            SET locked_at = NOW(), created_at = NOW() 
            WHERE key = ${key}
         `;
         req.idempotencyLocked = true;
      }
    } else {
      // Create new key
      try {
        await supabasePrisma.$executeRaw`
            INSERT INTO "idempotency_keys" (key, user_id, path, method, params, body, locked_at, expires_at, created_at)
            VALUES (${key}, ${userId}, ${path}, ${method}, ${JSON.stringify(req.params)}::jsonb, ${JSON.stringify(req.body)}::jsonb, NOW(), NOW() + INTERVAL '24 hours', NOW())
        `;
        req.idempotencyLocked = true;
      } catch (err) {
         // Handle unique constraint violation (race condition)
         // Postgres code 23505
         if (err.code === '23505' || (err.message && err.message.includes('already exists'))) {
             logger.warn(`Idempotency key ${key} collision (race condition). Treating as locked.`);
             return res.status(409).json({
                error: 'Conflict',
                message: 'Request is currently being processed.'
             });
         }
         throw err;
      }
    }

    // Intercept response
    const originalSend = res.send;
    const originalJson = res.json;

    res.json = function (body) {
        logger.debug('Idempotency: res.json called');
        if (res.locals.idempotencySaved || !req.idempotencyLocked) {
            return originalJson.call(this, body);
        }

        const status = res.statusCode;
        
        // Save async
        supabasePrisma.$executeRaw`
            UPDATE "idempotency_keys"
            SET response_status = ${status}, response_body = ${JSON.stringify(body)}::jsonb, locked_at = NULL
            WHERE key = ${key}
        `.then(() => logger.debug('Idempotency: Response saved'))
         .catch(err => logger.error(`Failed to save idempotency response for key ${key}:`, err));
        
        res.locals.idempotencySaved = true;
        return originalJson.call(this, body);
    };

    res.send = function (body) {
        logger.debug('Idempotency: res.send called');
        if (res.locals.idempotencySaved || !req.idempotencyLocked) {
            return originalSend.call(this, body);
        }

        const status = res.statusCode;
        let responseBody = body;
        try {
            if (typeof body === 'string') {
                responseBody = JSON.parse(body);
            }
        } catch (e) {
            responseBody = { _raw_content: body };
        }

        supabasePrisma.$executeRaw`
            UPDATE "idempotency_keys"
            SET response_status = ${status}, response_body = ${JSON.stringify(responseBody)}::jsonb, locked_at = NULL
            WHERE key = ${key}
        `.then(() => logger.debug('Idempotency: Response saved'))
         .catch(err => logger.error(`Failed to save idempotency response for key ${key}:`, err));
        
        res.locals.idempotencySaved = true;
        return originalSend.call(this, body);
    };

    next();

  } catch (error) {
    logger.error('Idempotency middleware error', error);
    // Release lock on error
    try {
        await supabasePrisma.$executeRaw`DELETE FROM "idempotency_keys" WHERE key = ${key}`;
    } catch (e) { /* ignore */ }
    
    return res.status(500).json({ error: 'Idempotency error' });
  }
};

module.exports = idempotency;
