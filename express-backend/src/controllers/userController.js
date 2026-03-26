const logger = require('../utils/logger');
const { supabasePrisma } = require('../database/prisma');
const { supabase } = require('../database/supabase');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all users
 * @route GET /api/v1/users
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Only admin can list all users
    if (req.user.role !== 'admin') {
      return next(new AppError('Not authorized to view users', 403));
    }

    // Use Supabase Admin API to list users from auth.users
    if (!supabase) {
      logger.error('Supabase client not initialized. Cannot fetch users.');
      return next(new AppError('Supabase client not initialized. Check server logs.', 500));
    }
    
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      logger.error('Supabase listUsers error:', error);
      return next(new AppError('Failed to fetch users from Supabase Auth: ' + error.message, 500));
    }
    
    const users = data.users || [];

    // Also fetch our public user profiles to merge role/municipality info
    let publicProfiles = [];
    try {
      publicProfiles = await supabasePrisma.user.findMany({
        select: {
          id: true,
          role: true,
          municipalityCode: true,
          fullName: true,
          contactNo: true
        }
      });
    } catch (dbError) {
      // If column doesn't exist, we just skip profile merging for now to avoid 500
      logger.warn('Failed to fetch public profiles (likely schema mismatch):', dbError.message);
    }

    // Create a map for quick lookup
    const profileMap = new Map(publicProfiles.map(p => [p.id, p]));

    // Merge auth user data with public profile data
    const mergedUsers = users.map(user => {
      const profile = profileMap.get(user.id) || {};
      return {
        id: user.id,
        email: user.email,
        role: profile.role || 'user', // Default to user if no profile
        municipalityCode: profile.municipalityCode || null,
        fullName: profile.fullName || null,
        contactNo: profile.contactNo || null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at
      };
    });
    
    res.status(200).json({
      status: 'success',
      results: mergedUsers.length,
      data: {
        users: mergedUsers
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

/**
 * Create a new user (Admin only)
 * @route POST /api/v1/users
 */
exports.createUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(new AppError('Not authorized to create users', 403));
    }

    if (!supabase) {
      return next(new AppError('Supabase client not initialized.', 500));
    }

    const { email, password, role, municipalityCode, fullName, contactNo } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // auto-confirm for admin created users
    });

    if (authError) {
      logger.error('Supabase createUser error:', authError);
      return next(new AppError(authError.message, 400));
    }

    const newUserId = authData.user.id;

    // 2. Create user profile in public.User table
    const newUser = await supabasePrisma.user.create({
      data: {
        id: newUserId,
        email,
        role: role || 'user',
        municipalityCode: municipalityCode || null,
        fullName: fullName || null,
        contactNo: contactNo || null
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: newUserId,
          email,
          ...newUser
        }
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    next(error);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    // Only admin can update other users
    if (req.user.role !== 'admin') {
      return next(new AppError('Not authorized to update users', 403));
    }

    const { id } = req.params;
    const { role, municipalityCode, fullName, contactNo } = req.body;

    // Check if user exists in public table
    let existingUser = null;
    try {
      existingUser = await supabasePrisma.user.findUnique({
        where: { id }
      });
    } catch (e) {
      logger.warn(`User ${id} not found in public table or schema mismatch`);
    }

    let updatedUser;
    
    // Try upsert approach to handle race conditions or missing records gracefully
    try {
      updatedUser = await supabasePrisma.user.upsert({
        where: { id },
        update: {
          role,
          municipalityCode,
          fullName,
          contactNo
        },
        create: {
          id,
          email: 'unknown@example.com', // Fallback
          role: role || 'user',
          municipalityCode,
          fullName,
          contactNo
        },
        select: {
          id: true,
          role: true,
          municipalityCode: true,
          fullName: true,
          contactNo: true
        }
      });
    } catch (upsertError) {
      logger.error('Upsert failed:', upsertError);
      throw upsertError;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    next(error);
  }
};
