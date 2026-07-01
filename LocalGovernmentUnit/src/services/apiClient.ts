import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { supabase } from "./supabase";

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

  // Supabase JWT (preferred)
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // ignore — fall through to API key
    }
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

let refreshing: Promise<unknown> | null = null;

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as
      | (InternalAxiosRequestConfig & { __retried?: boolean })
      | undefined;

    if (status === 401 && original && !original.__retried && supabase) {
      original.__retried = true;
      try {
        refreshing = refreshing ?? supabase.auth.refreshSession();
        await refreshing;
        refreshing = null;
        return apiClient(original);
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