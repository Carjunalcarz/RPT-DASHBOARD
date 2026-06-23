import { adminTable, describeError } from "./supabase";

export interface User {
  id: string;
  username: string;
  email: string;
  status: "active" | "inactive";
  created_at: string;
  is_super_admin: boolean;
}

export interface Role {
  id: string;
  role_name: string;
  role_code: string;
  is_active?: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  module_name: string;
  route_path: string;
  is_active: boolean;
  created_at: string;
  icons?: string | null;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  created_at: string;
}

export interface RoleModuleAccess {
  role_id: string;
  module_id: string;
  created_at: string;
}

export interface Facility {
  id: string;
  facility_name: string;
  is_active: boolean;
  created_at: string;
}

export interface UserFacility {
  user_id: string;
  facilities_id: string;
  created_at: string;
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

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get a query builder for an RBAC table in the configured schema.
 * `adminTable` returns null only when supabase isn't configured at all;
 * callers translate that into their preferred empty/error response.
 */
function tableOrNull(name: string) {
  return adminTable(name);
}

// ────────────────────────────────────────────────────────────────────────────
// Users (pending_users-backed list)
// ────────────────────────────────────────────────────────────────────────────

export const fetchUsers = async (): Promise<User[]> => {
  const tbl = tableOrNull("pending_users");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("id, username, email, created_at, is_confirmed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", describeError(error));
      return [];
    }

    interface PendingUserData {
      id: string;
      username: string;
      email: string;
      created_at: string;
      is_confirmed: boolean;
    }

    const users: User[] = (data || []).map((user: PendingUserData) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.is_confirmed ? ("active" as const) : ("inactive" as const),
      created_at: user.created_at,
      is_super_admin: false,
    }));

    return users;
  } catch (err) {
    console.error("Error in fetchUsers:", describeError(err));
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Roles
// ────────────────────────────────────────────────────────────────────────────

export const fetchRoles = async (): Promise<Role[]> => {
  const tbl = tableOrNull("roles");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", describeError(error));
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchRoles:", describeError(err));
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Modules
// ────────────────────────────────────────────────────────────────────────────

export const fetchModules = async (): Promise<Module[]> => {
  const tbl = tableOrNull("modules");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching modules:", describeError(error));
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchModules:", describeError(err));
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// User-Roles
// ────────────────────────────────────────────────────────────────────────────

export const assignRoleToUser = async (
  userId: string,
  roleId: string,
): Promise<{ success: boolean; error?: string }> => {
  const del = tableOrNull("user_roles");
  if (!del) return { success: false, error: "Supabase not configured" };

  try {
    // Remove any existing role assignment for this user (one role per user)
    const { error: deleteError } = await del.delete().eq("user_id", userId);
    if (deleteError) {
      console.error("Error removing old role:", describeError(deleteError));
    }

    // Assign the new role (use a fresh builder to avoid stale chain state)
    const ins = tableOrNull("user_roles");
    if (!ins) return { success: false, error: "Supabase not configured" };
    const { error } = await ins.insert([{ user_id: userId, role_id: roleId }]);

    if (error) {
      return {
        success: false,
        error: `Failed to assign role: ${describeError(error)}`,
      };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
};

export const getUserRoles = async (userId: string): Promise<Role[]> => {
  const tbl = tableOrNull("user_roles");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select(
        `
        roles:role_id (
          id,
          role_name,
          role_code,
          created_at
        )
      `,
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user roles:", describeError(error));
      return [];
    }

    return (
      (data as unknown as Array<{ roles: Role[] }>)
        ?.map((entry) => entry.roles)
        .flat()
        .filter(Boolean) || []
    );
  } catch (err) {
    console.error("Error in getUserRoles:", describeError(err));
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Role-Module access (role_permissions table — name is historical)
// ────────────────────────────────────────────────────────────────────────────

export const assignModulesToRole = async (
  roleId: string,
  moduleIds: string[],
): Promise<{ success: boolean; error?: string }> => {
  const del = tableOrNull("role_permissions");
  if (!del) return { success: false, error: "Supabase not configured" };

  try {
    // Remove all existing module assignments for this role
    const { error: deleteError } = await del.delete().eq("role_id", roleId);
    if (deleteError) {
      console.error(
        "Error removing old module assignments:",
        describeError(deleteError),
      );
    }

    // Add new module assignments (default all CRUD to true)
    if (moduleIds.length > 0) {
      const assignments = moduleIds.map((moduleId) => ({
        role_id: roleId,
        module_id: moduleId,
        can_select: true,
        can_insert: true,
        can_update: true,
        can_delete: true,
      }));

      const ins = tableOrNull("role_permissions");
      if (!ins) return { success: false, error: "Supabase not configured" };
      const { error } = await ins.insert(assignments);

      if (error) {
        return {
          success: false,
          error: `Failed to assign modules: ${describeError(error)}`,
        };
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
};

export const getRoleModules = async (roleId: string): Promise<Module[]> => {
  const tbl = tableOrNull("role_permissions");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select(
        "module_id, modules:module_id(id, module_name, route_path, icons, is_active, created_at)",
      )
      .eq("role_id", roleId);

    if (error) {
      console.error("Error fetching role modules:", describeError(error));
      return [];
    }

    interface RoleModuleEntry {
      modules: Module;
    }

    return (
      (data as unknown as RoleModuleEntry[] | null)
        ?.map((entry) => entry.modules)
        .filter(Boolean) || []
    );
  } catch (err) {
    console.error("Error in getRoleModules:", describeError(err));
    return [];
  }
};

export const fetchRoleModuleAssignments = async (): Promise<
  RoleModuleAccess[]
> => {
  const tbl = tableOrNull("role_permissions");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching role module assignments:",
        describeError(error),
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(
      "Error in fetchRoleModuleAssignments:",
      describeError(err),
    );
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Facilities
// ────────────────────────────────────────────────────────────────────────────

export const fetchFacilities = async (): Promise<Facility[]> => {
  const tbl = tableOrNull("facilities");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching facilities:", describeError(error));
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchFacilities:", describeError(err));
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// User-Facilities
// ────────────────────────────────────────────────────────────────────────────

export const assignFacilitiesToUser = async (
  userId: string,
  facilityIds: string[],
): Promise<{ success: boolean; error?: string }> => {
  const del = tableOrNull("user_facilities");
  if (!del) return { success: false, error: "Supabase not configured" };

  try {
    // Remove all existing facility assignments for this user
    const { error: deleteError } = await del.delete().eq("user_id", userId);
    if (deleteError) {
      console.error(
        "Error removing old facility assignments:",
        describeError(deleteError),
      );
    }

    // Add new facility assignments
    if (facilityIds.length > 0) {
      const assignments = facilityIds.map((facilityId) => ({
        user_id: userId,
        facilities_id: facilityId,
      }));

      const ins = tableOrNull("user_facilities");
      if (!ins) return { success: false, error: "Supabase not configured" };
      const { error } = await ins.insert(assignments);

      if (error) {
        return {
          success: false,
          error: `Failed to assign facilities: ${describeError(error)}`,
        };
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
};

export const getUserFacilities = async (
  userId: string,
): Promise<Facility[]> => {
  const tbl = tableOrNull("user_facilities");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select(
        `
        facilities:facilities_id (
          id,
          facility_name,
          is_active,
          created_at
        )
      `,
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user facilities:", describeError(error));
      return [];
    }

    return (
      (data as unknown as Array<{ facilities: Facility[] }>)
        ?.map((entry) => entry.facilities)
        .flat()
        .filter(Boolean) || []
    );
  } catch (err) {
    console.error("Error in getUserFacilities:", describeError(err));
    return [];
  }
};

export const fetchUserFacilityAssignments = async (): Promise<
  UserFacility[]
> => {
  const tbl = tableOrNull("user_facilities");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching user facility assignments:",
        describeError(error),
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(
      "Error in fetchUserFacilityAssignments:",
      describeError(err),
    );
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// User-Role aggregate
// ────────────────────────────────────────────────────────────────────────────

export const fetchUserRoleAssignments = async () => {
  const tbl = tableOrNull("user_roles");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select(
        `
        user_id,
        role_id,
        created_at,
        roles:role_id (id, role_name, role_code)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching user role assignments:",
        describeError(error),
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchUserRoleAssignments:", describeError(err));
    return [];
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Role Permissions — explicit CRUD with boolean flags
// ────────────────────────────────────────────────────────────────────────────

export const fetchRolePermissions = async (): Promise<RolePermission[]> => {
  const tbl = tableOrNull("role_permissions");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(
        "Error fetching role permissions:",
        describeError(error),
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchRolePermissions:", describeError(err));
    return [];
  }
};

export const getRolePermissions = async (
  roleId: string,
): Promise<RolePermission[]> => {
  const tbl = tableOrNull("role_permissions");
  if (!tbl) return [];

  try {
    const { data, error } = await tbl
      .select("*")
      .eq("role_id", roleId);
    if (error) {
      console.error(
        "Error fetching role permissions:",
        describeError(error),
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in getRolePermissions:", describeError(err));
    return [];
  }
};

export const upsertRolePermission = async (
  roleId: string,
  moduleId: string,
  permissions: {
    can_select: boolean;
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
  },
): Promise<{ success: boolean; error?: string }> => {
  const lookup = tableOrNull("role_permissions");
  if (!lookup) return { success: false, error: "Supabase not configured" };

  try {
    // Check if a record already exists
    const { data: existing } = await lookup
      .select("id")
      .eq("role_id", roleId)
      .eq("module_id", moduleId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const upd = tableOrNull("role_permissions");
      if (!upd) return { success: false, error: "Supabase not configured" };
      const { error } = await upd.update(permissions).eq("id", existing.id);
      if (error) return { success: false, error: describeError(error) };
    } else {
      // Insert new record
      const ins = tableOrNull("role_permissions");
      if (!ins) return { success: false, error: "Supabase not configured" };
      const { error } = await ins.insert({
        role_id: roleId,
        module_id: moduleId,
        ...permissions,
      });
      if (error) return { success: false, error: describeError(error) };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
};

export const deleteRolePermission = async (
  roleId: string,
  moduleId: string,
): Promise<{ success: boolean; error?: string }> => {
  const tbl = tableOrNull("role_permissions");
  if (!tbl) return { success: false, error: "Supabase not configured" };

  try {
    const { error } = await tbl
      .delete()
      .eq("role_id", roleId)
      .eq("module_id", moduleId);
    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
};

export const saveAllRolePermissions = async (
  roleId: string,
  modulePermissions: Array<{
    module_id: string;
    can_select: boolean;
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
  }>,
): Promise<{ success: boolean; error?: string }> => {
  const del = tableOrNull("role_permissions");
  if (!del) return { success: false, error: "Supabase not configured" };

  try {
    // Remove all existing permissions for this role
    const { error: deleteError } = await del.delete().eq("role_id", roleId);
    if (deleteError) {
      console.error(
        "Error removing old role permissions:",
        describeError(deleteError),
      );
    }

    // Insert only modules that have at least one permission enabled
    const permissionsToInsert = modulePermissions
      .filter(
        (p) => p.can_select || p.can_insert || p.can_update || p.can_delete,
      )
      .map((p) => ({
        role_id: roleId,
        module_id: p.module_id,
        can_select: p.can_select,
        can_insert: p.can_insert,
        can_update: p.can_update,
        can_delete: p.can_delete,
      }));

    if (permissionsToInsert.length > 0) {
      const ins = tableOrNull("role_permissions");
      if (!ins) return { success: false, error: "Supabase not configured" };
      const { error } = await ins.insert(permissionsToInsert);
      if (error) return { success: false, error: describeError(error) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
};
