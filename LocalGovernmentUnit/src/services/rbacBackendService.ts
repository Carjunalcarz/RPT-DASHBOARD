import { apiClient } from "./apiClient";

/**
 * Client for the express-backend RBAC endpoints (/api/v1/rbac/*).
 *
 * The shapes returned here match the live Supabase tables that already back
 * the existing RBACContext, so the same UI types compose cleanly:
 *   role.roleCode / role.roleName     (DB: role_code / role_name)
 *   module.routePath / module.moduleName / module.icons / module.category
 *
 * Mutation endpoints are super-admin-gated server-side; non-admin callers
 * will receive 403 and the caller is expected to handle it.
 */

export interface BackendRole {
  id: string;
  roleCode: string | null;
  roleName: string | null;
  createdAt?: string | null;
  moduleCount?: number;
  userCount?: number;
  assignedAt?: string | null;
}

export interface BackendModule {
  id: string;
  moduleName: string | null;
  routePath: string | null;
  icons: string | null;
  isActive: boolean | null;
  filePath: string | null;
  category: string | null;
  createdAt?: string | null;
  canSelect?: boolean;
  canInsert?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export interface BackendUserProfile {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: string | null;
  fullName: string | null;
  isService?: boolean;
}

export interface BackendMe {
  user: BackendUserProfile | null;
  roles: BackendRole[];
  modules: BackendModule[];
  moduleIds: string[];
  routePaths: string[];
  isSuperAdmin: boolean;
}

interface Envelope<T> {
  status: "success";
  data: T;
}

const RBAC = "/api/v1/rbac";

function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  return p.then((res) => res.data.data);
}

// ---------- read ----------

export function getMe(): Promise<BackendMe> {
  return unwrap(apiClient.get<Envelope<BackendMe>>(`${RBAC}/me`));
}

export function getModules(includeInactive = false): Promise<BackendModule[]> {
  return unwrap(
    apiClient.get<Envelope<BackendModule[]>>(`${RBAC}/modules`, {
      params: includeInactive ? { all: 1 } : {},
    })
  );
}

export interface CreateModuleInput {
  moduleName: string;
  routePath: string;
  icons?: string | null;
  filePath?: string | null;
  category?: string | null;
  isActive?: boolean;
}

export function createModule(body: CreateModuleInput): Promise<BackendModule> {
  return unwrap(
    apiClient.post<Envelope<BackendModule>>(`${RBAC}/modules`, body),
  );
}

export function updateModule(
  id: string,
  body: Partial<CreateModuleInput>,
): Promise<BackendModule> {
  return unwrap(
    apiClient.patch<Envelope<BackendModule>>(`${RBAC}/modules/${id}`, body),
  );
}

export function deleteModule(id: string): Promise<{ id: string }> {
  return unwrap(
    apiClient.delete<Envelope<{ id: string }>>(`${RBAC}/modules/${id}`),
  );
}

export function getRoles(): Promise<BackendRole[]> {
  return unwrap(apiClient.get<Envelope<BackendRole[]>>(`${RBAC}/roles`));
}

export interface BackendRoleDetail extends BackendRole {
  modules: BackendModule[];
}

export function getRole(id: string): Promise<BackendRoleDetail> {
  return unwrap(apiClient.get<Envelope<BackendRoleDetail>>(`${RBAC}/roles/${id}`));
}

export function getUserRoles(userId: string): Promise<BackendRole[]> {
  return unwrap(
    apiClient.get<Envelope<BackendRole[]>>(`${RBAC}/users/${userId}/roles`)
  );
}

// ---------- mutations (super_admin only) ----------

export function createRole(body: {
  roleCode: string;
  roleName: string;
}): Promise<BackendRole> {
  return unwrap(apiClient.post<Envelope<BackendRole>>(`${RBAC}/roles`, body));
}

export function updateRole(
  id: string,
  body: { roleCode?: string; roleName?: string }
): Promise<BackendRole> {
  return unwrap(apiClient.patch<Envelope<BackendRole>>(`${RBAC}/roles/${id}`, body));
}

export function deleteRole(id: string): Promise<{ id: string }> {
  return unwrap(apiClient.delete<Envelope<{ id: string }>>(`${RBAC}/roles/${id}`));
}

export interface RoleModuleSetItem {
  moduleId: string;
  canSelect?: boolean;
  canInsert?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

/**
 * Replace the modules a role can access.
 * Pass an array of moduleId strings to grant full CRUD on each, or
 * an array of items to set per-action flags.
 */
export function setRoleModules(
  roleId: string,
  modules: Array<string | RoleModuleSetItem>
): Promise<BackendRoleDetail> {
  return unwrap(
    apiClient.put<Envelope<BackendRoleDetail>>(`${RBAC}/roles/${roleId}/modules`, {
      modules,
    })
  );
}

export interface BackendRolePermission {
  id: string;
  roleId: string;
  moduleId: string;
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/**
 * Upsert one role->module access row with explicit CRUD flags.
 * Used by the per-action Role Permissions page.
 */
export function upsertRoleModule(
  roleId: string,
  moduleId: string,
  perms: {
    canSelect?: boolean;
    canInsert?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  }
): Promise<BackendRolePermission> {
  return unwrap(
    apiClient.put<Envelope<BackendRolePermission>>(
      `${RBAC}/roles/${roleId}/modules/${moduleId}`,
      perms
    )
  );
}

/**
 * Remove one role->module access row.
 */
export function removeRoleModule(
  roleId: string,
  moduleId: string
): Promise<{ roleId: string; moduleId: string; removed: number }> {
  return unwrap(
    apiClient.delete<Envelope<{ roleId: string; moduleId: string; removed: number }>>(
      `${RBAC}/roles/${roleId}/modules/${moduleId}`
    )
  );
}

export function setUserRoles(
  userId: string,
  roleIds: string[]
): Promise<BackendRole[]> {
  return unwrap(
    apiClient.put<Envelope<BackendRole[]>>(`${RBAC}/users/${userId}/roles`, {
      roleIds,
    })
  );
}

export function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<BackendRole[]> {
  return unwrap(
    apiClient.post<Envelope<BackendRole[]>>(
      `${RBAC}/users/${userId}/roles/${roleId}`
    )
  );
}

export function revokeRoleFromUser(
  userId: string,
  roleId: string
): Promise<BackendRole[]> {
  return unwrap(
    apiClient.delete<Envelope<BackendRole[]>>(
      `${RBAC}/users/${userId}/roles/${roleId}`
    )
  );
}

// ---------- facilities ----------

export interface BackendFacility {
  id: string;
  facilityName: string | null;
  isActive: boolean | null;
  createdAt?: string | null;
}

export function getFacilities(
  activeOnly = false,
): Promise<BackendFacility[]> {
  return unwrap(
    apiClient.get<Envelope<BackendFacility[]>>(`${RBAC}/facilities`, {
      params: activeOnly ? { active: 1 } : {},
    }),
  );
}

export function createFacility(body: {
  facilityName: string;
  isActive?: boolean;
}): Promise<BackendFacility> {
  return unwrap(
    apiClient.post<Envelope<BackendFacility>>(`${RBAC}/facilities`, body),
  );
}

export function updateFacility(
  id: string,
  body: { facilityName?: string; isActive?: boolean },
): Promise<BackendFacility> {
  return unwrap(
    apiClient.patch<Envelope<BackendFacility>>(
      `${RBAC}/facilities/${id}`,
      body,
    ),
  );
}

export function deleteFacility(id: string): Promise<{ id: string }> {
  return unwrap(
    apiClient.delete<Envelope<{ id: string }>>(`${RBAC}/facilities/${id}`),
  );
}

// ---------- user <-> facilities ----------

export interface BackendUserFacility {
  id: string;
  facilityName: string | null;
  isActive: boolean | null;
  assignedAt?: string | null;
}

export function getUserFacilities(
  userId: string,
): Promise<BackendUserFacility[]> {
  return unwrap(
    apiClient.get<Envelope<BackendUserFacility[]>>(
      `${RBAC}/users/${userId}/facilities`,
    ),
  );
}

export function setUserFacilities(
  userId: string,
  facilityIds: string[],
): Promise<BackendUserFacility[]> {
  return unwrap(
    apiClient.put<Envelope<BackendUserFacility[]>>(
      `${RBAC}/users/${userId}/facilities`,
      { facilityIds },
    ),
  );
}