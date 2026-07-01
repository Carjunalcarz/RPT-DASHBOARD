/**
 * Backend session-token store.
 *
 * The express backend mints its OWN HS256 access/refresh tokens (signed with
 * SUPABASE_JWT_SECRET) — they are not real Supabase GoTrue tokens, so
 * supabase-js cannot refresh them and silently drops the session once the
 * ~1h access token expires. When that happens the app was falling back to the
 * shared x-api-key, which the backend treats as a super-admin *service
 * account* (that's the phantom "Super Admin" on the profile).
 *
 * To keep the real user identity attached to every backend request, we persist
 * the backend tokens here (localStorage) and drive Bearer auth + token refresh
 * from this store instead of relying on the supabase-js session. Plain module,
 * no React, no import cycles.
 */

const ACCESS_KEY = "rptas.backend.accessToken";
const REFRESH_KEY = "rptas.backend.refreshToken";

export function setTokens(
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined,
): void {
  try {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    else localStorage.removeItem(ACCESS_KEY);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    // storage unavailable (private mode / SSR) — ignore
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  setTokens(null, null);
}
