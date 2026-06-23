import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getMe,
  type BackendMe,
  type BackendModule,
} from "@/services/rbacBackendService";
import { useAuthStore } from "@/store";

/**
 * Hook for backend-driven module visibility.
 *
 * Mirrors the shape that the legacy Supabase-direct RBACContext exposes
 * (hasModuleAccess / hasPermission / userModules) but sources the data from
 * `/api/v1/rbac/me` on the express-backend. The backend aggregates the user's
 * role_permissions rows from the live Supabase tables (roles, modules,
 * role_permissions, user_roles), so the answer is consistent with what the
 * Supabase-direct path would have computed.
 *
 * Loads only when the user is signed in. The query is keyed by user id so
 * the cache evicts on logout/switch.
 */

const STALE_MS = 30 * 1000;
const ROOT_KEY = "backend-rbac";

export type ModuleAction = "select" | "insert" | "update" | "delete";

export interface UseBackendRbacResult {
  me: BackendMe | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isSuperAdmin: boolean;
  modules: BackendModule[];
  routePaths: Set<string>;
  hasModuleAccess: (idOrRoutePath: string) => boolean;
  hasPermission: (idOrRoutePath: string, action: ModuleAction) => boolean;
  refresh: () => Promise<void>;
}

function matchModule(
  m: BackendModule,
  key: string
): boolean {
  return m.id === key || m.routePath === key;
}

export function useBackendRbac(): UseBackendRbacResult {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const qc = useQueryClient();

  const query = useQuery<BackendMe>({
    queryKey: [ROOT_KEY, "me", userId ?? null],
    queryFn: getMe,
    enabled: !!userId,
    staleTime: STALE_MS,
  });

  const me = query.data;
  const modules = me?.modules ?? [];
  const isSuperAdmin = !!me?.isSuperAdmin;

  const routePaths = useMemo(
    () => new Set((me?.routePaths ?? []).filter(Boolean)),
    [me]
  );

  const hasModuleAccess = useMemo(
    () => (key: string) => {
      if (!key) return false;
      if (isSuperAdmin) return true;
      return modules.some((m) => matchModule(m, key));
    },
    [isSuperAdmin, modules]
  );

  const hasPermission = useMemo(
    () => (key: string, action: ModuleAction) => {
      if (!key) return false;
      if (isSuperAdmin) return true;
      const m = modules.find((mod) => matchModule(mod, key));
      if (!m) return false;
      switch (action) {
        case "select": return !!m.canSelect;
        case "insert": return !!m.canInsert;
        case "update": return !!m.canUpdate;
        case "delete": return !!m.canDelete;
      }
    },
    [isSuperAdmin, modules]
  );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: [ROOT_KEY] });
  };

  return {
    me,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuperAdmin,
    modules,
    routePaths,
    hasModuleAccess,
    hasPermission,
    refresh,
  };
}

/** Convenience query for the global module catalog (admin pages). */
export const backendRbacKeys = {
  me: (userId: string | undefined) => [ROOT_KEY, "me", userId ?? null] as const,
  roles: () => [ROOT_KEY, "roles"] as const,
  role: (id: string) => [ROOT_KEY, "roles", id] as const,
  modules: (includeInactive: boolean) =>
    [ROOT_KEY, "modules", includeInactive] as const,
  userRoles: (userId: string) => [ROOT_KEY, "users", userId, "roles"] as const,
};