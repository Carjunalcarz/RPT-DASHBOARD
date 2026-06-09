/**
 * AuthService — wraps Supabase Auth for the lifecycle endpoints
 * (register / login / refresh / logout / me).
 *
 * Token philosophy: we do NOT mint our own JWTs. Supabase Auth already issues
 * an access token (~1h) + refresh token (~7d) that we propagate to the client
 * as HTTP-only cookies. Verification of the access token on subsequent
 * requests is handled by the existing src/middleware/authIdentity.js
 * (HS256 via SUPABASE_JWT_SECRET, or RS256/ES256 via JWKS). That middleware
 * already reads from the `access_token` cookie, so the cookie name we set
 * here is wire-compatible.
 *
 * Registration uses supabase.auth.admin.createUser with email_confirm=true,
 * which auto-confirms the email — convenient for the admin-created users in
 * this LGU dashboard. If you need self-service signups with email
 * verification, swap to supabase.auth.signUp.
 */

const { supabase } = require('../rptas/database/supabase');
const { supabasePrisma } = require('../rptas/database/prisma');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const ALLOWED_ROLES = new Set(['admin', 'user']);

function shapeUser(u, profile = null) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fullName: profile?.fullName || u.user_metadata?.full_name || null,
    role:
      profile?.role ||
      u.user_metadata?.role ||
      u.app_metadata?.role ||
      'user',
    avatarUrl: profile?.avatarUrl || null,
    displayName: profile?.displayName || null,
    municipalityCode: profile?.municipalityCode || null,
    lastLoginAt: profile?.lastLoginAt || u.last_sign_in_at || null,
    createdAt: u.created_at,
  };
}

function shapeSession(session) {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
    tokenType: session.token_type,
  };
}

class AuthService {
  constructor({ supabasePrisma: prismaIn } = {}) {
    // DI provides supabasePrisma; fall back to the singleton if instantiated
    // without DI (e.g. tests).
    this.prisma = prismaIn || supabasePrisma;
  }

  // ------------------------------------------------------------------
  // Internal: best-effort profile sync to public.users. If the table or
  // schema isn't set up, we log a warning but don't fail auth flows.
  // ------------------------------------------------------------------
  async _syncProfile(authUser, extras = {}) {
    if (!authUser?.id) return null;
    try {
      const updateData = {
        email: authUser.email,
        ...(extras.fullName !== undefined ? { fullName: extras.fullName } : {}),
        ...(extras.role !== undefined ? { role: extras.role } : {}),
      };
      const createData = {
        id: authUser.id,
        email: authUser.email,
        fullName: extras.fullName ?? authUser.user_metadata?.full_name ?? null,
        role: extras.role ?? authUser.user_metadata?.role ?? 'user',
      };
      const profile = await this.prisma.user.upsert({
        where: { id: authUser.id },
        update: updateData,
        create: createData,
      });
      return profile;
    } catch (err) {
      logger.warn(`AuthService: profile sync skipped (${err.message})`);
      return null;
    }
  }

  async _loadProfile(userId) {
    if (!userId) return null;
    try {
      return await this.prisma.user.findUnique({ where: { id: userId } });
    } catch (err) {
      logger.warn(`AuthService: profile load failed (${err.message})`);
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Lifecycle endpoints
  // ------------------------------------------------------------------

  async register({ email, password, fullName, role = 'user' }) {
    const normRole = String(role).toLowerCase();
    if (!ALLOWED_ROLES.has(normRole)) {
      throw new AppError(
        `role must be one of: ${[...ALLOWED_ROLES].join(', ')}`, 400
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: normRole },
    });

    if (error) {
      // Supabase returns 422-style "user already registered" for dupes.
      const status = /already registered|exists/i.test(error.message) ? 409 : 400;
      throw new AppError(error.message || 'Registration failed', status);
    }

    const profile = await this._syncProfile(data.user, {
      fullName, role: normRole,
    });

    return { user: shapeUser(data.user, profile) };
  }

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    });

    if (error || !data?.session) {
      throw new AppError(
        error?.message || 'Invalid email or password', 401
      );
    }

    const profile = await this._loadProfile(data.user?.id);
    if (profile) {
      try {
        await this.prisma.user.update({
          where: { id: data.user.id },
          data: { lastLoginAt: new Date() },
        });
      } catch { /* non-fatal */ }
    } else {
      // First login after admin-created user without trigger — sync now.
      await this._syncProfile(data.user);
    }

    return {
      user: shapeUser(data.user, profile),
      session: shapeSession(data.session),
    };
  }

  async refresh({ refreshToken }) {
    if (!refreshToken) {
      throw new AppError('Refresh token missing', 401);
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session) {
      throw new AppError(
        error?.message || 'Refresh token is invalid or expired', 401
      );
    }

    const profile = await this._loadProfile(data.user?.id);
    return {
      user: shapeUser(data.user, profile),
      session: shapeSession(data.session),
    };
  }

  /**
   * Logout — revokes Supabase's server-side session for the access token
   * (so the refresh token can no longer be used to mint new access tokens).
   * The cookies themselves are cleared by the controller.
   */
  async logout({ accessToken }) {
    if (!accessToken) return { ok: true };
    try {
      // admin.signOut(jwt, scope?) — 'global' kills all sessions for that
      // user; 'local' just this one. Default 'global' for safety.
      await supabase.auth.admin.signOut(accessToken, 'global');
    } catch (err) {
      // Stale token / already expired — clearing cookies still succeeds.
      logger.warn(`AuthService.logout: supabase signOut failed: ${err.message}`);
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------
  // Admin-facing: list / get / delete Supabase auth users.
  // ------------------------------------------------------------------

  /**
   * Page through Supabase Auth's user list (auth.users).
   *
   * @param {object} opts
   * @param {number} opts.page      1-indexed page (default 1)
   * @param {number} opts.perPage   max 1000 (Supabase cap); default 100
   * @param {string} opts.search    optional case-insensitive email substring filter
   */
  async listUsers({ page = 1, perPage = 100, search = '' } = {}) {
    const safePerPage = Math.max(1, Math.min(1000, parseInt(perPage, 10) || 100));
    const safePage = Math.max(1, parseInt(page, 10) || 1);

    const { data, error } = await supabase.auth.admin.listUsers({
      page: safePage,
      perPage: safePerPage,
    });

    if (error) {
      throw new AppError(error.message || 'Failed to list users', 500);
    }

    const allUsers = data?.users || [];
    const needle = String(search || '').trim().toLowerCase();
    const filtered = needle
      ? allUsers.filter((u) => (u.email || '').toLowerCase().includes(needle))
      : allUsers;

    // Pull profile rows in one query for the page so we can attach role +
    // displayName + status from public.users to each auth user.
    const ids = filtered.map((u) => u.id).filter(Boolean);
    let profileById = new Map();
    if (ids.length) {
      try {
        const profiles = await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, role: true, displayName: true, fullName: true,
            avatarUrl: true, municipalityCode: true, lastLoginAt: true,
          },
        });
        profileById = new Map(profiles.map((p) => [p.id, p]));
      } catch (err) {
        this.logger?.warn(`listUsers: profile fetch failed: ${err.message}`);
      }
    }

    const shaped = filtered.map((u) => ({
      id: u.id,
      email: u.email,
      fullName:
        profileById.get(u.id)?.fullName ||
        u.user_metadata?.full_name ||
        null,
      displayName:
        profileById.get(u.id)?.displayName ||
        u.user_metadata?.display_name ||
        null,
      role:
        profileById.get(u.id)?.role ||
        u.user_metadata?.role ||
        u.app_metadata?.role ||
        'user',
      avatarUrl: profileById.get(u.id)?.avatarUrl || null,
      municipalityCode: profileById.get(u.id)?.municipalityCode || null,
      // Supabase Auth's "confirmed" notion (email confirmed = active enough)
      emailConfirmedAt: u.email_confirmed_at || null,
      bannedUntil: u.banned_until || null,
      lastSignInAt: u.last_sign_in_at || null,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      isService: false,
    }));

    return {
      users: shaped,
      page: safePage,
      perPage: safePerPage,
      // Supabase admin.listUsers returns just the page array; it doesn't give
      // total count. Calling code can keep paging until length < perPage.
      hasMore: shaped.length === safePerPage,
    };
  }

  /**
   * Look up a single Supabase auth user by id, with profile attached.
   */
  async getUserById(userId) {
    if (!userId) throw new AppError('userId required', 400);
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw new AppError(error.message || 'User lookup failed', 404);
    if (!data?.user) throw new AppError('User not found', 404);

    const profile = await this._loadProfile(userId);
    return { user: shapeUser(data.user, profile) };
  }

  /**
   * Permanently delete a Supabase auth user. The DB profile in public.users
   * (and any cascading rows like user_roles) is removed via foreign-key
   * ON DELETE CASCADE.
   */
  async deleteUser(userId) {
    if (!userId) throw new AppError('userId required', 400);
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw new AppError(error.message || 'Delete failed', 400);
    return { id: userId };
  }

  async getMe(userId) {
    if (!userId) throw new AppError('Authentication required', 401);

    // The user passed authIdentity, so we know the JWT was valid. Trust the
    // id and just load the profile.
    const profile = await this._loadProfile(userId);

    // Pull the canonical auth-user record too for fields like email,
    // metadata, createdAt.
    let authUser = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      authUser = data?.user || null;
    } catch (err) {
      logger.warn(`AuthService.getMe: admin.getUserById failed: ${err.message}`);
    }

    return { user: shapeUser(authUser || { id: userId }, profile) };
  }
}

module.exports = AuthService;
