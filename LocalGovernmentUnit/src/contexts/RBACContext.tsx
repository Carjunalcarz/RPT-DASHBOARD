import React, { createContext, useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store";
import {
  getMe,
  getModules,
  type BackendModule,
  type BackendRole,
} from "@/services/rbacBackendService";

/**
 * RBACContext is the single source of truth for module visibility / per-action
 * permissions on the frontend. Consumers:
 *   - Dashboard.tsx          uses userModules to build the dock/sidebar
 *   - useRBAC + useModulePermissions hooks read from here
 *   - <Can> / <RequireModule> components read from here
 *
 * Data source:
 *   - The backend's /api/v1/rbac/me returns the user's modules with CRUD
 *     flags already attached, plus the super_admin flag.
 *   - /api/v1/rbac/modules returns the full active catalog (used as the
 *     `modules` field for callers that need to know about all modules).
 *
 * We deliberately do NOT subscribe to Supabase realtime here anymore. The
 * backend is the canonical source; admin pages explicitly call
 * refreshPermissions() after a mutation. If you need cross-tab refresh,
 * add a BroadcastChannel handler or pick a polling interval — for now a
 * page refresh / clicking Refresh on an admin page is enough.
 */

export interface Module {
  id: string;
  module_name: string;
  route_path: string;
  icons: string | null;
  is_active: boolean;
  created_at: string;
  file_path?: string | null;
  category?: string | null;
}

export interface RolePermission {
  id: string;
  role_id: string;
  module_id: string;
  can_select: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface ModulePermissions {
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface UserRoleInfo {
  roleCode: string | null;
  roleName: string | null;
}

interface RBACContextType {
  modules: Module[];
  userModules: Module[];
  userPermissions: RolePermission[];
  roles: UserRoleInfo[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasModuleAccess: (moduleIdOrPath: string) => boolean;
  hasPermission: (
    moduleIdOrPath: string,
    action: "select" | "insert" | "update" | "delete",
  ) => boolean;
  getModulePermissions: (moduleIdOrPath: string) => ModulePermissions;
  refreshPermissions: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

// Convert a backend module (camelCase + CRUD flags) into the snake_case shape
// that the rest of the app expects.
function backendToUiModule(m: BackendModule): Module {
  return {
    id: m.id,
    module_name: m.moduleName ?? "",
    route_path: m.routePath ?? "",
    icons: m.icons ?? null,
    is_active: m.isActive ?? true,
    created_at: m.createdAt ?? "",
    file_path: m.filePath ?? null,
    category: m.category ?? null,
  };
}

// Synthesize a RolePermission row from a backend module's flags. Used so
// existing consumers (e.g. hasPermission) that key off `userPermissions` keep
// working. `role_id` is unused by those callers — leave it blank.
function syntheticPermissionFromModule(m: BackendModule): RolePermission {
  return {
    id: `synthetic-${m.id}`,
    role_id: "",
    module_id: m.id,
    can_select: !!m.canSelect,
    can_insert: !!m.canInsert,
    can_update: !!m.canUpdate,
    can_delete: !!m.canDelete,
    created_at: "",
  };
}

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useAuthStore((state) => state.user);
  const [modules, setModules] = useState<Module[]>([]);
  const [userModules, setUserModules] = useState<Module[]>([]);
  const [userPermissions, setUserPermissions] = useState<RolePermission[]>([]);
  const [roles, setRoles] = useState<UserRoleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendSuperAdmin, setBackendSuperAdmin] = useState(false);

  const forceSuperAdmin = import.meta.env.VITE_FORCE_ADMIN === "true";
  const isSuperAdmin =
    forceSuperAdmin || backendSuperAdmin || (user?.is_super_admin ?? false);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);

    try {
      // Backend `/me` requires the request to have credentials. In dev with
      // VITE_FORCE_ADMIN=true the apiClient still sends x-api-key which the
      // backend treats as a service request and returns ALL active modules
      // (super-admin view) — that's exactly what we want for the dock.
      //
      // Fetch the full catalog separately so the `modules` field exposed by
      // this context is always the complete active set, even when /me only
      // returned the user's subset.
      const [meResult, allResult] = await Promise.all([
        getMe().catch((err) => {
          console.warn("RBAC: /me failed, falling back to empty:", err);
          return null;
        }),
        getModules(false).catch((err) => {
          console.warn("RBAC: /modules failed, falling back to empty:", err);
          return [] as BackendModule[];
        }),
      ]);

      const allModulesUi = allResult.map(backendToUiModule);
      setModules(allModulesUi);

      if (!meResult) {
        // Backend unreachable — clear user-scoped state but leave the
        // global module catalog so admin pages can still render.
        setUserModules([]);
        setUserPermissions([]);
        setRoles([]);
        setBackendSuperAdmin(false);
        return;
      }

      // A bare x-api-key (no user JWT) resolves to the backend's "service
      // account", which reports isSuperAdmin:true. That must NOT make a browser
      // user appear as super-admin — otherwise a missing/expired session shows
      // a phantom "Super Admin". Only trust isSuperAdmin for a real user.
      const isServiceAccount =
        meResult.user?.isService === true ||
        meResult.user?.id === "service-account";
      const isAdmin = !!meResult.isSuperAdmin && !isServiceAccount;
      setBackendSuperAdmin(isAdmin);

      // The user's assigned RBAC roles (from user_roles), independent of the
      // legacy single `users.role` string. Consumers (e.g. the profile page)
      // should display these.
      setRoles(
        (meResult.roles || []).map((r: BackendRole) => ({
          roleCode: r.roleCode ?? null,
          roleName: r.roleName ?? null,
        })),
      );

      if (isAdmin || forceSuperAdmin) {
        // Super-admin (real or forced) sees every active module.
        setUserModules(allModulesUi);
        // Synthesize CRUD-on-all permissions so per-action checks pass.
        setUserPermissions(
          allModulesUi.map((m) => ({
            id: `synthetic-${m.id}`,
            role_id: "",
            module_id: m.id,
            can_select: true,
            can_insert: true,
            can_update: true,
            can_delete: true,
            created_at: "",
          })),
        );
      } else {
        // Regular user — backend already filtered to their accessible
        // modules with CRUD flags attached.
        setUserModules(meResult.modules.map(backendToUiModule));
        setUserPermissions(
          meResult.modules.map(syntheticPermissionFromModule),
        );
      }
    } catch (err) {
      console.error("Error refreshing RBAC:", err);
    } finally {
      setIsLoading(false);
    }
  }, [forceSuperAdmin]);

  // Re-fetch whenever the user identity changes (login / logout) and on
  // mount. The user dep is stringified to avoid object-identity churn.
  useEffect(() => {
    refreshPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refreshPermissions]);

  // ---------------- queries ----------------

  const hasModuleAccess = useCallback(
    (moduleIdOrPath: string): boolean => {
      if (isSuperAdmin) return true;
      return userModules.some(
        (m) => m.id === moduleIdOrPath || m.route_path === moduleIdOrPath,
      );
    },
    [isSuperAdmin, userModules],
  );

  const hasPermission = useCallback(
    (
      moduleIdOrPath: string,
      action: "select" | "insert" | "update" | "delete",
    ): boolean => {
      if (isSuperAdmin) return true;

      const module = modules.find(
        (m) => m.id === moduleIdOrPath || m.route_path === moduleIdOrPath,
      );
      if (!module) return false;

      return userPermissions.some((p) => {
        if (p.module_id !== module.id) return false;
        switch (action) {
          case "select":
            return p.can_select;
          case "insert":
            return p.can_insert;
          case "update":
            return p.can_update;
          case "delete":
            return p.can_delete;
          default:
            return false;
        }
      });
    },
    [isSuperAdmin, userPermissions, modules],
  );

  const getModulePermissions = useCallback(
    (moduleIdOrPath: string): ModulePermissions => {
      if (isSuperAdmin) {
        return {
          canSelect: true,
          canInsert: true,
          canUpdate: true,
          canDelete: true,
        };
      }

      const module = modules.find(
        (m) => m.id === moduleIdOrPath || m.route_path === moduleIdOrPath,
      );
      if (!module) {
        return {
          canSelect: false,
          canInsert: false,
          canUpdate: false,
          canDelete: false,
        };
      }

      const modulePerms = userPermissions.filter(
        (p) => p.module_id === module.id,
      );

      return {
        canSelect: modulePerms.some((p) => p.can_select),
        canInsert: modulePerms.some((p) => p.can_insert),
        canUpdate: modulePerms.some((p) => p.can_update),
        canDelete: modulePerms.some((p) => p.can_delete),
      };
    },
    [isSuperAdmin, userPermissions, modules],
  );

  return (
    <RBACContext.Provider
      value={{
        modules,
        userModules,
        userPermissions,
        roles,
        isLoading,
        isSuperAdmin,
        hasModuleAccess,
        hasPermission,
        getModulePermissions,
        refreshPermissions,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export default RBACContext;
