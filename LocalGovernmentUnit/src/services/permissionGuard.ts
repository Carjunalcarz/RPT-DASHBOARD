/**
 * Permission Guard Service
 *
 * Wraps database operations with automatic permission checking.
 * Before any insert/update/delete operation, it validates the user's
 * permissions for the given module. If unauthorized, returns an error
 * instead of executing.
 *
 * Note on schemas:
 *   - The PERMISSION LOOKUP itself (roles, modules, user_roles,
 *     role_permissions, the super-admin RPC) always reads from the
 *     configured system-admin schema via adminTable() / adminRpc().
 *   - The GUARDED OPERATIONS (guardedInsert / guardedUpdate / etc.) take a
 *     user-supplied table name and target whatever schema supabase-js's
 *     default search path resolves them to. They are NOT forced through
 *     adminTable() because the caller's table may belong to any module
 *     (Accounting, HR, etc.) and isn't necessarily in the admin schema.
 */

import {
  supabase,
  isSupabaseConfigured,
  adminTable,
  SYSTEM_ADMIN_SCHEMA,
  describeError,
} from "./supabase";

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  error?: string;
}

// Operation result with permission awareness
export interface GuardedResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  permissionDenied?: boolean;
}

/**
 * Call an RPC in the configured system-admin schema.
 *
 * supabase-js exposes `supabase.schema('X').rpc('fn')` for non-default
 * schemas. We fall back to bare `supabase.rpc(...)` when the configured
 * schema is "public" so behaviour matches the pre-schema-flexibility era.
 */
function adminRpc<T = unknown>(
  fn: string,
  args?: Record<string, unknown>,
) {
  if (!supabase) return null;
  if (SYSTEM_ADMIN_SCHEMA === "public") {
    return supabase.rpc(fn, args) as unknown as Promise<{
      data: T | null;
      error: { message: string; code?: string } | null;
    }>;
  }
  return (
    supabase as unknown as {
      schema: (name: string) => {
        rpc: (
          name: string,
          a?: Record<string, unknown>,
        ) => Promise<{
          data: T | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    }
  )
    .schema(SYSTEM_ADMIN_SCHEMA)
    .rpc(fn, args);
}

/**
 * Check if the current user has a specific permission for a module
 */
export const checkPermission = async (
  userId: string,
  moduleRoutePath: string,
  action: "select" | "insert" | "update" | "delete",
): Promise<PermissionCheckResult> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { allowed: false, error: "Database not configured" };
  }

  try {
    // Step 1: Check if user is super admin via RPC. We try the modern name
    // first (get_current_user_super_admin) and fall back to the legacy one
    // (is_user_super_admin) so older databases keep working.
    let isSuperAdmin: boolean | null = null;
    {
      const modern = await adminRpc<boolean>("get_current_user_super_admin");
      if (modern && !modern.error) {
        isSuperAdmin = !!modern.data;
      } else {
        const legacy = await adminRpc<boolean>("is_user_super_admin");
        if (legacy && !legacy.error) isSuperAdmin = !!legacy.data;
      }
    }
    if (isSuperAdmin) return { allowed: true };

    // Step 2: Get the module by route path
    const modulesTbl = adminTable("modules");
    if (!modulesTbl) return { allowed: false, error: "Database not configured" };
    const { data: module } = await modulesTbl
      .select("id")
      .eq("route_path", moduleRoutePath)
      .eq("is_active", true)
      .single();

    if (!module) {
      return { allowed: false, error: "Module not found or inactive" };
    }

    // Step 3: Get user's roles
    const userRolesTbl = adminTable("user_roles");
    if (!userRolesTbl)
      return { allowed: false, error: "Database not configured" };
    const { data: userRoles } = await userRolesTbl
      .select("role_id")
      .eq("user_id", userId);

    if (!userRoles || userRoles.length === 0) {
      return { allowed: false, error: "No roles assigned" };
    }

    const roleIds = userRoles.map((ur: { role_id: string }) => ur.role_id);

    // Step 4: Check role_permissions for the module and action
    const rolePermsTbl = adminTable("role_permissions");
    if (!rolePermsTbl)
      return { allowed: false, error: "Database not configured" };
    const { data: permissions } = await rolePermsTbl
      .select("can_select, can_insert, can_update, can_delete")
      .eq("module_id", module.id)
      .in("role_id", roleIds);

    if (!permissions || permissions.length === 0) {
      return { allowed: false, error: "No permissions for this module" };
    }

    interface PermRow {
      can_select: boolean;
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
    }

    // Check if any role grants the requested action
    const hasPermission = (permissions as PermRow[]).some((p) => {
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

    if (!hasPermission) {
      const actionLabel = {
        select: "view",
        insert: "create",
        update: "update",
        delete: "delete",
      }[action];
      return {
        allowed: false,
        error: `You don't have permission to ${actionLabel} in this module`,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("Permission check error:", describeError(err));
    return { allowed: false, error: "Permission check failed" };
  }
};

/**
 * Execute a guarded insert operation.
 *
 * The `table` parameter is caller-supplied. It targets whatever schema the
 * default supabase-js search path resolves it to (almost always "public").
 * If you need a non-default schema for the data write, do
 * supabase.schema('X').from(table) inline instead of using this helper.
 */
export const guardedInsert = async <T>(
  userId: string,
  moduleRoutePath: string,
  table: string,
  data: Record<string, unknown>,
): Promise<GuardedResult<T>> => {
  const permCheck = await checkPermission(userId, moduleRoutePath, "insert");
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.error, permissionDenied: true };
  }

  if (!supabase) return { success: false, error: "Database not configured" };

  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) return { success: false, error: describeError(error) };
  return { success: true, data: result as T };
};

export const guardedUpdate = async <T>(
  userId: string,
  moduleRoutePath: string,
  table: string,
  id: string,
  data: Record<string, unknown>,
): Promise<GuardedResult<T>> => {
  const permCheck = await checkPermission(userId, moduleRoutePath, "update");
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.error, permissionDenied: true };
  }

  if (!supabase) return { success: false, error: "Database not configured" };

  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: describeError(error) };
  return { success: true, data: result as T };
};

export const guardedDelete = async (
  userId: string,
  moduleRoutePath: string,
  table: string,
  id: string,
): Promise<GuardedResult> => {
  const permCheck = await checkPermission(userId, moduleRoutePath, "delete");
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.error, permissionDenied: true };
  }

  if (!supabase) return { success: false, error: "Database not configured" };

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { success: false, error: describeError(error) };
  return { success: true };
};

export const guardedSelect = async <T>(
  userId: string,
  moduleRoutePath: string,
  table: string,
  query?: { column: string; value: unknown },
): Promise<GuardedResult<T[]>> => {
  const permCheck = await checkPermission(userId, moduleRoutePath, "select");
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.error, permissionDenied: true };
  }

  if (!supabase) return { success: false, error: "Database not configured" };

  let queryBuilder = supabase.from(table).select("*");

  if (query) {
    queryBuilder = queryBuilder.eq(query.column, query.value);
  }

  const { data, error } = await queryBuilder;

  if (error) return { success: false, error: describeError(error) };
  return { success: true, data: data as T[] };
};
