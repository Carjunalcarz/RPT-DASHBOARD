import { apiClient } from "./apiClient";
import * as tokenStore from "./tokenStore";

/**
 * Client for /api/v1/auth/* — the backend's auth lifecycle endpoints.
 *
 * Tokens travel two ways:
 *  - The backend sets HTTP-only cookies (access_token, refresh_token) for
 *    server-route auth. apiClient already has withCredentials: true, so the
 *    browser sends them back automatically.
 *  - The response body also echoes accessToken + refreshToken so we can
 *    call supabase.auth.setSession() and keep the supabase-js client (used
 *    by RBACContext and direct-to-Supabase admin pages) in sync.
 */

export interface BackendUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  municipalityCode: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface BackendSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
}

export interface LoginResponse extends BackendSession {
  user: BackendUser;
}

export interface MeResponse {
  user: BackendUser;
}

interface Envelope<T> {
  status: "success";
  data: T;
}

const BASE = "/api/v1/auth";

function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  return p.then((res) => res.data.data);
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role?: "admin" | "user";
}

export function register(input: RegisterInput): Promise<{ user: BackendUser }> {
  return unwrap(
    apiClient.post<Envelope<{ user: BackendUser }>>(`${BASE}/register`, input)
  );
}

export function login(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return unwrap(
    apiClient.post<Envelope<LoginResponse>>(`${BASE}/login`, input)
  );
}

/**
 * Calls the backend refresh endpoint. The browser sends the refresh_token
 * cookie automatically because apiClient has withCredentials: true.
 * Returns a new session pair that callers should pass to supabase-js
 * via auth.setSession().
 */
export function refresh(): Promise<LoginResponse> {
  // Send the refresh token in the body as well as relying on the cookie — a
  // different-origin HTTP backend can't receive the httpOnly cookie, so the
  // body is what actually works cross-origin.
  const refreshToken = tokenStore.getRefreshToken() ?? undefined;
  return unwrap(
    apiClient.post<Envelope<LoginResponse>>(
      `${BASE}/refresh`,
      refreshToken ? { refreshToken } : undefined,
    ),
  );
}

export function logout(): Promise<{ ok: boolean }> {
  return unwrap(
    apiClient.post<Envelope<{ ok: boolean }>>(`${BASE}/logout`)
  );
}

export function getMe(): Promise<MeResponse> {
  return unwrap(apiClient.get<Envelope<MeResponse>>(`${BASE}/me`));
}

// -------- admin: auth users --------

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  role: string | null;
  avatarUrl: string | null;
  municipalityCode: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isService?: boolean;
}

export interface ListUsersResponse {
  users: AuthUser[];
  page: number;
  perPage: number;
  hasMore: boolean;
}

export function listAuthUsers(opts: {
  page?: number;
  perPage?: number;
  search?: string;
} = {}): Promise<ListUsersResponse> {
  return unwrap(
    apiClient.get<Envelope<ListUsersResponse>>(`${BASE}/users`, {
      params: {
        ...(opts.page ? { page: opts.page } : {}),
        ...(opts.perPage ? { perPage: opts.perPage } : {}),
        ...(opts.search ? { search: opts.search } : {}),
      },
    }),
  );
}

export function getAuthUser(id: string): Promise<{ user: AuthUser }> {
  return unwrap(
    apiClient.get<Envelope<{ user: AuthUser }>>(`${BASE}/users/${id}`),
  );
}

export function deleteAuthUser(id: string): Promise<{ id: string }> {
  return unwrap(
    apiClient.delete<Envelope<{ id: string }>>(`${BASE}/users/${id}`),
  );
}
