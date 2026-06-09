/**
 * AuthController — HTTP handlers for /api/v1/auth/*.
 *
 * Cookies set / read:
 *   - access_token   (httpOnly, ~15min)  — also picked up by authIdentity
 *                                          so subsequent protected requests
 *                                          can authenticate via the cookie.
 *   - refresh_token  (httpOnly, ~7d, path="/api/v1/auth/refresh") — only
 *                    sent back to the refresh endpoint; reduces blast radius
 *                    of a cookie leak.
 *
 * SameSite=lax + secure-in-production guards against CSRF on the cookie path.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const ACCESS_MAX_AGE_MS  = 15 * 60 * 1000;          // 15 min
const REFRESH_MAX_AGE_MS = 7  * 24 * 60 * 60 * 1000; // 7 days

const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

function accessCookieOpts(maxAge = ACCESS_MAX_AGE_MS) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

function refreshCookieOpts(maxAge = REFRESH_MAX_AGE_MS) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge,
  };
}

function setSessionCookies(res, session) {
  if (!session) return;
  if (session.accessToken) {
    res.cookie(ACCESS_COOKIE, session.accessToken, accessCookieOpts());
  }
  if (session.refreshToken) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOpts());
  }
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE,  { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

function extractAccessToken(req) {
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

function extractRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken || null;
}

class AuthController {
  constructor({ authService }) {
    this.svc = authService;
  }

  // POST /register  { email, password, fullName, role? }
  register = async (req, res, next) => {
    try {
      const { email, password, fullName, role } = req.body || {};
      const data = await this.svc.register({ email, password, fullName, role });
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /login  { email, password }
  login = async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      const data = await this.svc.login({ email, password });
      setSessionCookies(res, data.session);
      // We also echo the refresh token in the body. Browser-side clients
      // that run supabase-js for direct queries (RBACContext, admin pages)
      // need both tokens to call supabase.auth.setSession() and keep their
      // own session in sync with ours. supabase-js stores refresh tokens
      // in localStorage anyway, so echoing it here does not change the
      // XSS posture for clients that already load that library.
      res.json({
        status: 'success',
        data: {
          user: data.user,
          accessToken: data.session?.accessToken,
          refreshToken: data.session?.refreshToken,
          expiresIn: data.session?.expiresIn,
          expiresAt: data.session?.expiresAt,
          tokenType: data.session?.tokenType,
        },
      });
    } catch (e) { next(e); }
  };

  // POST /refresh
  refresh = async (req, res, next) => {
    try {
      const refreshToken = extractRefreshToken(req);
      const data = await this.svc.refresh({ refreshToken });
      setSessionCookies(res, data.session);
      res.json({
        status: 'success',
        data: {
          user: data.user,
          accessToken: data.session?.accessToken,
          refreshToken: data.session?.refreshToken,
          expiresIn: data.session?.expiresIn,
          expiresAt: data.session?.expiresAt,
          tokenType: data.session?.tokenType,
        },
      });
    } catch (e) { next(e); }
  };

  // POST /logout
  logout = async (req, res, next) => {
    try {
      const accessToken = extractAccessToken(req);
      await this.svc.logout({ accessToken });
      clearSessionCookies(res);
      res.json({ status: 'success', data: { ok: true } });
    } catch (e) { next(e); }
  };

  // GET /me — requires authenticate middleware upstream
  me = async (req, res, next) => {
    try {
      const data = await this.svc.getMe(req.user?.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /users?page=1&perPage=100&search=foo  (super_admin only)
  listUsers = async (req, res, next) => {
    try {
      const data = await this.svc.listUsers({
        page: req.query.page,
        perPage: req.query.perPage,
        search: req.query.search || '',
      });
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /users/:id  (super_admin only)
  getUser = async (req, res, next) => {
    try {
      const data = await this.svc.getUserById(req.params.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // DELETE /users/:id  (super_admin only)
  deleteUser = async (req, res, next) => {
    try {
      const data = await this.svc.deleteUser(req.params.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };
}

module.exports = AuthController;
