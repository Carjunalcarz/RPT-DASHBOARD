import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { supabase } from "./supabase";
import * as tokenStore from "./tokenStore";

/**
 * Backend HTTP client.
 *
 * - Base URL: VITE_BACKEND_URL (defaults to http://localhost:3000)
 * - Auth header order:
 *   1. Supabase session JWT (Authorization: Bearer <jwt>) — preferred
 *   2. API key (x-api-key) — fallback for service-to-service calls,
 *      kept for compatibility with the legacy mock-Admin flow.
 *
 * 401 responses trigger a one-shot session refresh; if that fails we surface
 * the error so the caller can route the user to /login.
 */

/**
 * Backend host root (no /api suffix) — the RBAC/auth calls prefix /api/v1
 * themselves. Resolution order:
 *   1. VITE_BACKEND_URL      — explicit override, used as-is.
 *   2. VITE_API_BASE_URL     — the shared var; strip a trailing /api or /api/v1
 *                              so a single env var can drive both clients.
 *   3. localhost fallback for local dev.
 */
function resolveBackendBase(): string {
  const explicit = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (apiBase) return apiBase.replace(/\/$/, "").replace(/\/api(\/v\d+)?$/, "");

  return "http://localhost:3000";
}

const BASE_URL = resolveBackendBase();

const API_KEY = import.meta.env.VITE_API_ACCESS_KEY as string | undefined;
const FORCE_ADMIN = import.meta.env.VITE_FORCE_ADMIN === "true";

async function attachAuth(config: InternalAxiosRequestConfig) {
  config.headers = config.headers ?? {};

  // Real-user JWT. Prefer the backend-issued access token we persist ourselves
  // (tokenStore) — it survives even after supabase-js drops its session, and is
  // refreshable via the backend /auth/refresh endpoint. Fall back to the
  // supabase session token if the store is empty.
  let token: string | null = tokenStore.getAccessToken();
  if (!token && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
    } catch {
      // ignore — fall through to API key
    }
  }
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // API key (always sent if configured; backend treats matching x-api-key as
  // a service-to-service request and skips JWT validation)
  if (API_KEY) {
    config.headers["x-api-key"] = API_KEY;
  }

  // Force-admin dev flag. The backend only acts on this when it ALSO has
  // ALLOW_FORCE_ADMIN=true, in which case it persists a real super_admin role
  // for the authenticated user (bootstrap). Harmless if the backend opts out.
  if (FORCE_ADMIN) {
    config.headers["x-force-admin"] = "true";
  }

  return config;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30_000,
});

apiClient.interceptors.request.use(attachAuth);

let refreshing: Promise<boolean> | null = null;

/**
 * Refresh the session. Prefer the backend /auth/refresh endpoint with the
 * stored refresh token in the BODY (works cross-origin, unlike the httpOnly
 * cookie which a different-origin HTTP backend can't receive). Falls back to
 * supabase-js. Uses a bare axios call so it never re-enters this interceptor.
 * Returns true if a new access token was obtained.
 */
async function refreshSession(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken();
  if (refreshToken) {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        { refreshToken },
        {
          headers: API_KEY ? { "x-api-key": API_KEY } : undefined,
          withCredentials: true,
        },
      );
      const data = res.data?.data;
      if (data?.accessToken) {
        tokenStore.setTokens(data.accessToken, data.refreshToken ?? refreshToken);
        if (supabase) {
          try {
            await supabase.auth.setSession({
              access_token: data.accessToken,
              refresh_token: data.refreshToken ?? refreshToken,
            });
          } catch {
            // supabase-js can't persist our custom tokens — that's fine,
            // tokenStore is the source of truth for backend auth.
          }
        }
        return true;
      }
    } catch {
      // fall through to supabase refresh
    }
  }
  if (supabase) {
    try {
      const { data } = await supabase.auth.refreshSession();
      return !!data.session?.access_token;
    } catch {
      // ignore
    }
  }
  return false;
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as
      | (InternalAxiosRequestConfig & { __retried?: boolean })
      | undefined;

    if (status === 401 && original && !original.__retried) {
      original.__retried = true;
      try {
        refreshing = refreshing ?? refreshSession();
        const ok = await refreshing;
        refreshing = null;
        if (ok) return apiClient(original);
      } catch {
        refreshing = null;
      }
    }

    return Promise.reject(error);
  }
);

export function backendBaseUrl(): string {
  return BASE_URL;
}