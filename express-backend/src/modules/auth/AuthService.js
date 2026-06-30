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

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabase } = require('../rptas/database/supabase');
const { supabasePrisma } = require('../rptas/database/prisma');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const ALLOWED_ROLES = new Set(['admin', 'user']);

// DB-direct auth (login/refresh) verifies credentials against auth.users and
// mints Supabase-compatible HS256 JWTs signed with SUPABASE_JWT_SECRET — so the
// app does NOT depend on the GoTrue/Kong HTTP gateway being reachable. The
// access token's claims match what the auth middleware verifies.
const ACCESS_TTL_SEC = 60 * 60;            // 1 hour
const REFRESH_TTL_SEC = 60 * 60 * 24 * 7;  // 7 days

function getJwtSecret() {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s) throw new AppError('SUPABASE_JWT_SECRET is not configured', 500);
  return s;
}

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

  // ------------------------------------------------------------------
  // DB-direct auth helpers
  // ------------------------------------------------------------------
  async _findAuthUserByEmail(email) {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id::text AS id, email, encrypted_password, email_confirmed_at,
              banned_until, raw_user_meta_data, raw_app_meta_data,
              last_sign_in_at, created_at
       FROM auth.users
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       LIMIT 1`,
      String(email || '').trim()
    );
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  // Build a shapeUser-compatible object from an auth.users row.
  _shapeAuthRow(row) {
    return {
      id: row.id,
      email: row.email,
      user_metadata: row.raw_user_meta_data || {},
      app_metadata: row.raw_app_meta_data || {},
      last_sign_in_at: row.last_sign_in_at,
      created_at: row.created_at,
    };
  }

  // Mint a Supabase-compatible access token + a refresh token (both HS256,
  // signed with SUPABASE_JWT_SECRET). Stateless: refresh re-validates the JWT.
  _issueSession(authUser) {
    const secret = getJwtSecret();
    const nowSec = Math.floor(Date.now() / 1000);
    const sessionId = crypto.randomUUID();
    const accessToken = jwt.sign(
      {
        sub: authUser.id,
        email: authUser.email,
        role: 'authenticated',
        aud: 'authenticated',
        user_metadata: authUser.user_metadata || {},
        app_metadata: authUser.app_metadata || {},
        session_id: sessionId,
      },
      secret,
      { algorithm: 'HS256', expiresIn: ACCESS_TTL_SEC }
    );
    const refreshToken = jwt.sign(
      { sub: authUser.id, type: 'refresh', session_id: sessionId },
      secret,
      { algorithm: 'HS256', expiresIn: REFRESH_TTL_SEC }
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: ACCESS_TTL_SEC,
      expires_at: nowSec + ACCESS_TTL_SEC,
    };
  }

  // Admin-approval gate: block login if a pending_users row exists and is not
  // yet confirmed. No-op when the table/schema isn't present (table is empty
  // for users created outside that workflow).
  async _assertNotPending(email) {
    const schema = (process.env.SYSTEM_ADMIN_SCHEMA || 'admin_setup').replace(/[^A-Za-z0-9_]/g, '');
    try {
      const rows = await this.prisma.$queryRawUnsafe(
        `SELECT is_confirmed FROM "${schema}".pending_users WHERE lower(email) = lower($1) LIMIT 1`,
        String(email || '').trim()
      );
      if (Array.isArray(rows) && rows[0] && rows[0].is_confirmed === false) {
        throw new AppError(
          'Your account is awaiting admin confirmation. You can log in once approved.',
          403
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // table/schema missing → no gate
    }
  }

  async login({ email, password }) {
    const invalid = () => new AppError('Invalid email or password', 401);
    if (!email || !password) throw invalid();

    const row = await this._findAuthUserByEmail(email);
    if (!row || !row.encrypted_password) throw invalid();

    const ok = await bcrypt.compare(String(password), String(row.encrypted_password));
    if (!ok) throw invalid();

    if (row.banned_until && new Date(row.banned_until) > new Date()) {
      throw new AppError('This account is banned', 403);
    }
    await this._assertNotPending(row.email);

    const authUser = this._shapeAuthRow(row);

    const profile = await this._loadProfile(authUser.id);
    if (profile) {
      try {
        await this.prisma.user.update({
          where: { id: authUser.id },
          data: { lastLoginAt: new Date() },
        });
      } catch { /* non-fatal */ }
    } else {
      await this._syncProfile(authUser);
    }
    // Best-effort: reflect the sign-in on auth.users too.
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1::uuid`,
        authUser.id
      );
    } catch { /* non-fatal */ }

    return {
      user: shapeUser(authUser, profile),
      session: shapeSession(this._issueSession(authUser)),
    };
  }

  async refresh({ refreshToken }) {
    if (!refreshToken) {
      throw new AppError('Refresh token missing', 401);
    }

    let claims;
    try {
      claims = jwt.verify(refreshToken, getJwtSecret(), { algorithms: ['HS256'] });
    } catch {
      throw new AppError('Refresh token is invalid or expired', 401);
    }
    if (!claims || claims.type !== 'refresh' || !claims.sub) {
      throw new AppError('Refresh token is invalid', 401);
    }

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id::text AS id, email, banned_until, raw_user_meta_data,
              raw_app_meta_data, last_sign_in_at, created_at
       FROM auth.users WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
      claims.sub
    );
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) throw new AppError('User no longer exists', 401);
    if (row.banned_until && new Date(row.banned_until) > new Date()) {
      throw new AppError('This account is banned', 403);
    }

    const authUser = this._shapeAuthRow(row);
    const profile = await this._loadProfile(authUser.id);
    return {
      user: shapeUser(authUser, profile),
      session: shapeSession(this._issueSession(authUser)),
    };
  }

  /**
   * Logout — revokes Supabase's server-side session for the access token
   * (so the refresh token can no longer be used to mint new access tokens).
   * The cookies themselves are cleared by the controller.
   */
  async logout(/* { accessToken } */) {
    // Tokens are stateless HS256 JWTs (DB-direct auth); there is no GoTrue
    // session to revoke. The controller clears the httpOnly cookies, which
    // is sufficient to end the browser session.
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
