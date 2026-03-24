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
    const { supabase: supabaseClient } = require('../database/supabase'); // Dynamic import to handle mock
    
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

    // const { supabase } = require('../database/supabase'); // Duplicate import removed

    logger.info(`Attempting login for user: ${email}`);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
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

    const { supabasePrisma } = require('../database/prisma'); // Import at top or here

    let role = user.role; // Default to Supabase Auth role (usually 'authenticated')
    let profile = null;
    
    // Fetch custom role from public.users table
    try {
      const dbUser = await supabasePrisma.user.findUnique({
        where: { id: user.id },
        select: {
          role: true,
          municipalityCode: true,
          fullName: true,
          displayName: true,
          avatarUrl: true,
        }
      });
      if (dbUser) {
        profile = dbUser;
      }
      if (dbUser && dbUser.role) {
        role = dbUser.role;
      } else {
        // If user not in DB, create them with default role 'user'
        try {
          await supabasePrisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              role: 'user'
            }
          });
          role = 'user';
        } catch (createErr) {
          logger.warn('Failed to auto-create user profile on login', createErr);
        }
      }
    } catch (err) {
      logger.warn('Failed to fetch user role from DB during login', err);
    }

    // Set access token in HttpOnly cookie
    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.expires_in * 1000 // Convert to milliseconds
    });

    // Also return token in response body for frontend storage (needed for API calls if cookies fail or for non-browser clients)
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      token: session.access_token, // Add this line
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: role, // Use the fetched role
          municipalityCode: profile?.municipalityCode || null,
          fullName: profile?.fullName || null,
          displayName: profile?.displayName || null,
          avatarUrl: profile?.avatarUrl || null,
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
