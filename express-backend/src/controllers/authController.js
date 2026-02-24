const { supabase } = require('../database/supabase');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Login user with email and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors first
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    if (!supabase) {
      logger.error('Supabase client is not initialized');
      return res.status(503).json({
        status: 'error',
        message: 'Authentication service unavailable'
      });
    }

    logger.info(`Attempting login for user: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.warn(`Login failed for email: ${email}. Error: ${error.message}`);
      
      // Determine appropriate status code based on error
      let statusCode = 401;
      if (error.message.includes('rate limit')) statusCode = 429;
      
      return res.status(statusCode).json({
        status: 'fail',
        message: error.message
      });
    }

    const { session, user } = data;

    if (!session || !user) {
      logger.error('Login succeeded but no session returned');
      return res.status(500).json({
        status: 'error',
        message: 'Login succeeded but failed to retrieve session'
      });
    }

    logger.info(`User logged in successfully: ${user.id}`);

    // Set access token in HttpOnly cookie
    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.expires_in * 1000 // Convert to milliseconds
    });

    // Return successful response
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        }
      }
    });

  } catch (error) {
    logger.error('Unexpected error during login:', error);
    next(error);
  }
};
