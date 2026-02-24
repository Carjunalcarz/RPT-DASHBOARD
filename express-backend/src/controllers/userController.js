const logger = require('../utils/logger');

/**
 * Get all users
 * @route GET /api/v1/users
 */
exports.getUsers = async (req, res, next) => {
  try {
    // User table removed as per request. 
    // This endpoint now returns an empty list or could use Supabase Admin API.
    
    res.status(200).json({
      status: 'success',
      results: 0,
      message: 'Public User table has been removed. Use Supabase Admin API to list users.',
      data: {
        users: []
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/v1/users/me
 */
exports.getMe = async (req, res, next) => {
  try {
    // req.user is populated by auth middleware
    const user = req.user;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};
