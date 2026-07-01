import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

export const normalizeApiV1Base = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'http://localhost:3000/api/v1';
  const normalized = trimmed.replace(/\/+$/, '');
  if (normalized.endsWith('/api/v1')) return normalized;
  if (normalized.endsWith('/api')) return `${normalized}/v1`;
  if (/\/api\/v1$/.test(normalized)) return normalized;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return `${normalized}/api/v1`;
  if (normalized.startsWith('/')) return `${normalized}/api/v1`;
  return `${normalized}/api/v1`;
};

const API_URL = normalizeApiV1Base(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
);

/**
 * Canonical `.../api/v1` base, derived from VITE_API_BASE_URL (single switch).
 * Import this instead of hardcoding a host when you need an absolute endpoint
 * (e.g. passing a full URL to a component prop that can't use the axios base).
 */
export const API_V1_BASE = API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false // Do not send cookies, use only API key
});

// Request interceptor to add Bearer token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Check if we are in mock mode
    const isMockMode =
      typeof window !== 'undefined' &&
      typeof window.localStorage?.getItem === 'function' &&
      window.localStorage.getItem('auth_mode') === 'mock';
    
    // Attach the API Key for backend communication
    const apiKey = import.meta.env.VITE_API_ACCESS_KEY;
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }

    // Attach the real logged-in user's identity so the backend can attribute
    // writes (e.g. FAAS "Submitted By") to a person instead of the shared
    // API-key mock user. Name is URI-encoded to keep the header ASCII-safe.
    try {
      const user = useAuthStore.getState().user;
      if (user?.fullName) config.headers['x-actor-name'] = encodeURIComponent(user.fullName);
      if (user?.email) config.headers['x-actor-email'] = user.email;
    } catch {
      // Auth store unavailable — fall back to the mock user server-side.
    }

    if (isMockMode) {
      return config;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      const isMockMode =
        typeof window !== 'undefined' &&
        typeof window.localStorage?.getItem === 'function' &&
        window.localStorage.getItem('auth_mode') === 'mock';

      if (!isMockMode && typeof window !== 'undefined' && typeof window.localStorage?.removeItem === 'function') {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
