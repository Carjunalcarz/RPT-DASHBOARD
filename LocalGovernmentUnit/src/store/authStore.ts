import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import * as backendAuth from "@/services/authBackendService";
import * as tokenStore from "@/services/tokenStore";

/**
 * Authentication store.
 *
 * Flow:
 *   1. User submits login form -> store.login(email, password)
 *   2. We hit POST /api/v1/auth/login on the express-backend. The backend
 *      verifies credentials via Supabase Admin Auth, syncs the user's
 *      profile + role in public.users, and returns { user, accessToken,
 *      refreshToken, ... } plus HTTP-only cookies for cookie-based auth on
 *      subsequent backend routes.
 *   3. We hand the returned tokens to supabase.auth.setSession(...) so the
 *      supabase-js client (used directly by RBACContext, admin pages, etc.)
 *      is also signed in. From this point on:
 *        - apiClient calls -> backend reads cookie / Bearer (authIdentity)
 *        - supabase.from(...) -> supabase-js sends its access token
 *      Both layers share the same identity.
 *
 * Token refresh is handled by supabase-js automatically (and apiClient has
 * a 401 -> refresh -> retry interceptor wired to it).
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_super_admin: boolean;
  profilePicture?: string | null;
  municipalityCode?: string | null;
  classLevel?: string | null;
  fullName?: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    role?: "admin" | "user";
  }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfilePicture: (url: string | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setError: (error: string | null) => void;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
}

async function fetchIsSuperAdmin(forceAdmin: boolean): Promise<boolean> {
  if (forceAdmin) return true;
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { data, error } = await supabase.rpc(
      "get_current_user_super_admin"
    );
    if (error) {
      console.warn("get_current_user_super_admin failed:", error.message);
      return false;
    }
    return !!data;
  } catch (err) {
    console.warn("get_current_user_super_admin threw:", err);
    return false;
  }
}

function deriveUsername(email: string | null | undefined, fullName?: string | null): string {
  if (fullName?.trim()) return fullName.trim();
  if (email) return email.split("@")[0];
  return "user";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ---------------------------------------------------------------
      // login
      // ---------------------------------------------------------------
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        const normalizedEmail = email.toLowerCase().trim();
        const forceAdmin = import.meta.env.VITE_FORCE_ADMIN === "true";

        try {
          // 1. Backend login. The backend verifies credentials against the
          //    database directly and enforces the pending-users approval gate
          //    server-side (returns 403 with a clear message if unapproved),
          //    so we no longer make a direct-to-Supabase pending_users query
          //    here. The backend sets HTTP-only cookies AND returns
          //    { accessToken, refreshToken, user } in the response body.
          const result = await backendAuth.login({
            email: normalizedEmail,
            password,
          });

          // 2. Persist the backend-issued tokens. apiClient sends the access
          //    token as Bearer on every request and refreshes it via the
          //    backend /auth/refresh endpoint — independent of supabase-js,
          //    which cannot refresh these custom tokens and would otherwise
          //    drop the session (making the app fall back to the shared
          //    x-api-key service account => phantom "Super Admin").
          tokenStore.setTokens(result.accessToken, result.refreshToken);

          // 3. Sync supabase-js with the returned tokens so direct
          //    supabase.from(...) calls (RBACContext, admin pages, image
          //    uploads) are authenticated too.
          if (isSupabaseConfigured() && supabase) {
            try {
              await supabase.auth.setSession({
                access_token: result.accessToken,
                refresh_token: result.refreshToken,
              });
            } catch (e) {
              console.warn("supabase.auth.setSession failed:", e);
            }
          }

          // 4. Resolve super_admin (via the get_current_user_super_admin
          //    RPC). After setSession above, supabase-js has the auth.uid()
          //    context the function needs.
          const isSuperAdmin = await fetchIsSuperAdmin(forceAdmin);

          const userData: User = {
            id: result.user.id,
            email: result.user.email ?? normalizedEmail,
            fullName: result.user.fullName ?? null,
            username: deriveUsername(result.user.email, result.user.fullName),
            role: forceAdmin ? "admin" : result.user.role ?? "user",
            is_super_admin: isSuperAdmin,
            profilePicture: result.user.avatarUrl ?? null,
            municipalityCode: result.user.municipalityCode ?? null,
            classLevel: null,
          };

          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err) {
          const message = extractErrorMessage(err, "Login failed");
          console.error("Login error:", err);
          set({ error: message, isLoading: false });
          return false;
        }
      },

      // ---------------------------------------------------------------
      // register
      // ---------------------------------------------------------------
      register: async ({ email, password, fullName, role = "user" }) => {
        set({ isLoading: true, error: null });
        try {
          await backendAuth.register({
            email: email.toLowerCase().trim(),
            password,
            fullName: fullName.trim(),
            role,
          });
          set({ isLoading: false });
          return {
            ok: true,
            message:
              "Account created. You can now log in once an administrator " +
              "approves your account (if the pending-users workflow is on).",
          };
        } catch (err) {
          const message = extractErrorMessage(err, "Registration failed");
          set({ error: message, isLoading: false });
          return { ok: false, message };
        }
      },

      // ---------------------------------------------------------------
      // logout
      // ---------------------------------------------------------------
      logout: async () => {
        // Call backend first so it can revoke the server-side session and
        // clear cookies. If that fails (e.g. network), still clear local
        // state so the user appears logged out.
        try {
          await backendAuth.logout();
        } catch (err) {
          console.warn("backend logout failed:", err);
        }
        try {
          if (isSupabaseConfigured() && supabase) {
            await supabase.auth.signOut();
          }
        } catch (err) {
          console.warn("supabase.auth.signOut failed:", err);
        }
        tokenStore.clearTokens();
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateProfilePicture: (url) => {
        set((state) => ({
          user: state.user ? { ...state.user, profilePicture: url } : null,
        }));
      },
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: "auth-storage",
      // Only persist the user. Tokens live in cookies (backend) and
      // localStorage (supabase-js); we don't need to mirror them here.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
