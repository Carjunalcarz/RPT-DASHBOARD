const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for backend operations

let supabase = null;

// Validate URL format before creating client to prevent crash
const isValidUrl = (url) => url && url.match(/^https?:\/\//);

if (!isValidUrl(supabaseUrl) || !supabaseKey) {
  logger.warn('Supabase URL or Key missing or invalid in environment variables. Supabase functionality will be disabled.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logger.info('Supabase client initialized');
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
  }
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - The operation to retry (must return a promise)
 * @param {number} retries - Number of retries
 * @param {number} delay - Initial delay in ms
 */
async function withRetry(operation, retries = 3, delay = 1000) {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      logger.error('Max retries reached for Supabase operation', error);
      throw error;
    }
    
    logger.warn(`Supabase operation failed, retrying in ${delay}ms... (Retries left: ${retries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withRetry(operation, retries - 1, delay * 2);
  }
}

module.exports = {
  supabase,
  withRetry
};
