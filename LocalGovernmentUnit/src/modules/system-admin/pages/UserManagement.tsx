import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UserList,
  UserDialog,
  UserFacilitiesList,
  UserFacilitiesDialog,
  UserRolesList,
  UserRolesDialog,
} from "@/modules/system-admin/components";
import {
  PageHeader,
  StatsRow,
  StatCard,
  ActionsBar,
  PrimaryButton,
  Tabs,
} from "@/components/ui";
import { Users, Plus, RefreshCw } from "lucide-react";
import {
  getRoles,
  assignRoleToUser as assignRoleToUserBackend,
  setUserRoles as setUserRolesBackend,
  getUserRoles as getUserRolesBackend,
  getFacilities,
  setUserFacilities,
  getUserFacilities as getUserFacilitiesBackend,
  type BackendRole,
  type BackendFacility,
} from "@/services/rbacBackendService";
import {
  listAuthUsers,
  deleteAuthUser,
  type AuthUser,
} from "@/services/authBackendService";

// The existing dialog components expect snake_case shapes (legacy from the
// direct-Supabase era). Keep small adapter types here so the dialogs don't
// need to change.
interface Role {
  id: string;
  role_name: string;
  role_code: string;
  is_active?: boolean;
  created_at: string;
}

interface Facility {
  id: string;
  facility_name: string;
  is_active: boolean;
  created_at: string;
}

function backendRoleToUi(r: BackendRole): Role {
  return {
    id: r.id,
    role_name: r.roleName ?? "",
    role_code: r.roleCode ?? "",
    is_active: true,
    created_at: r.createdAt ?? "",
  };
}

function backendFacilityToUi(f: BackendFacility): Facility {
  return {
    id: f.id,
    facility_name: f.facilityName ?? "",
    is_active: !!f.isActive,
    created_at: f.createdAt ?? "",
  };
}
import { useAuthStore } from "@/store";
import RolePermissionsManagement from "./RolePermissionsManagement";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * UserManagement
 *
 * Lists actual Supabase Auth users (from auth.users) via the backend
 * /api/v1/auth/users endpoint. Earlier this page read from `pending_users`
 * which only contains rows from the legacy admin-approval registration
 * flow — that table is normally empty.
 *
 * - Create: calls backend /auth/register (auto-confirms via service role),
 *   then optionally assigns a role via rbacService.assignRoleToUser.
 * - Delete: calls backend /auth/users/:id which removes from auth.users
 *   plus cascades the public.users profile row.
 * - Role / Facility assignments still go through rbacService (those write
 *   to admin_setup.user_roles / user_facilities which Prisma backs).
 */

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  registeredAt: string;
}

type TabKey = "users" | "assignments" | "roles" | "access";

const tabs = [
  { key: "users", label: "Users" },
  { key: "assignments", label: "User Assignments" },
  { key: "roles", label: "User Roles" },
  { key: "access", label: "Access & Permissions" },
];

function describeError(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    e?.response?.data?.message ||
    e?.message ||
    (typeof err === "string" ? err : "Unknown error")
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function authUserToUi(u: AuthUser): User {
  // Active means email confirmed AND not currently banned. Anything else
  // counts as inactive (pending confirmation, deactivated, etc.).
  const bannedNow =
    !!u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now();
  const status: "active" | "inactive" =
    u.emailConfirmedAt && !bannedNow ? "active" : "inactive";
  return {
    id: u.id,
    name: u.displayName || u.fullName || u.email || "(no name)",
    email: u.email || "",
    status,
    registeredAt: formatDate(u.createdAt),
  };
}

const UserManagement = () => {
  const register = useAuthStore((s) => s.register);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUserRole, setSelectedUserRole] = useState<string>("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // User Assignments (user-facilities) state
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedUserForFacilities, setSelectedUserForFacilities] =
    useState<string>("");
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [userFacilityAssignments, setUserFacilityAssignments] = useState<
    Array<{
      id: string;
      userName: string;
      userEmail: string;
      facilities: string[];
      assignedAt: string;
    }>
  >([]);

  // User Roles (user-role assignments) state
  const [showRoleAssignmentModal, setShowRoleAssignmentModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<string>("");
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] =
    useState<string>("");
  const [roleAssignmentSearch, setRoleAssignmentSearch] = useState("");
  const [editingUserRoleId, setEditingUserRoleId] = useState<string | null>(
    null,
  );
  const [userRoleAssignments, setUserRoleAssignments] = useState<
    Array<{
      id: string;
      userName: string;
      userEmail: string;
      roleName: string;
      roleCode: string;
      assignedAt: string;
    }>
  >([]);

  // -----------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [listResult, fetchedRoles, fetchedFacilities] = await Promise.all([
        listAuthUsers({ perPage: 200 }),
        getRoles(),
        getFacilities(),
      ]);

      setUsers(listResult.users.map(authUserToUi));
      setFacilities(fetchedFacilities.map(backendFacilityToUi));
      setRoles(fetchedRoles.map(backendRoleToUi));
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      toast.error(`Failed to load users: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load user facility assignments when on assignments tab
  useEffect(() => {
    if (activeTab === "assignments") {
      loadUserFacilityAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, users, facilities]);

  // Load user role assignments when on roles tab
  useEffect(() => {
    if (activeTab === "roles") {
      loadUserRoleAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, users, roles]);

  // -----------------------------------------------------------------
  // Create / edit user
  // -----------------------------------------------------------------

  const handleCreate = async () => {
    if (editingUserId) {
      // Edit mode -- only role can change here.
      if (!selectedUserRole) {
        toast.error("Please select a role");
        return;
      }
      setIsSaving(true);
      try {
        // Replace (not append) so changing an existing user's role actually
        // swaps it out instead of leaving the previous role attached. See the
        // note in handleAssignRoleToUser.
        await setUserRolesBackend(editingUserId, [selectedUserRole]);
        toast.success("Role updated");
        resetForm();
        await loadData();
      } catch (err) {
        toast.error(`Failed to update role: ${describeError(err)}`);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Create mode
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error("Full name, email and password are required");
      return;
    }

    setIsSaving(true);
    try {
      const result = await register({
        email: formEmail,
        password: formPassword,
        fullName: formName,
        role: "user",
      });
      if (!result.ok) {
        toast.error(result.message || "Registration failed");
        return;
      }
      toast.success(`Created user "${formName}"`);
      resetForm();
      await loadData();
      // If a role was picked at create time, assign it now.
      if (selectedUserRole) {
        const created = await listAuthUsers({ search: formEmail, perPage: 5 });
        const newUser = created.users.find(
          (u) => (u.email || "").toLowerCase() === formEmail.toLowerCase(),
        );
        if (newUser) {
          try {
            await assignRoleToUserBackend(newUser.id, selectedUserRole);
            toast.success("Role assigned");
          } catch (err) {
            toast.error(`Role assignment failed: ${describeError(err)}`);
          }
        }
      }
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setSelectedUserRole("");
    setEditingUserId(null);
    setShowModal(false);
  };

  const handleEditUser = async (user: User) => {
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setEditingUserId(user.id);

    try {
      const userRoles = await getUserRolesBackend(user.id);
      if (userRoles.length > 0) {
        setSelectedUserRole(userRoles[0].id);
      } else {
        setSelectedUserRole("");
      }
    } catch (err) {
      console.error("Error fetching user roles:", describeError(err));
    }

    setShowModal(true);
  };

  const handleDeleteUser = async (id: string) => {
    const target = users.find((u) => u.id === id);
    const ok = await confirm({
      title: "Delete user?",
      message: target
        ? `Permanently delete ${target.name} (${target.email})? ` +
          "This removes them from Supabase Auth and cannot be undone."
        : "Permanently delete this user?",
      variant: "destructive",
      confirmLabel: "Delete user",
    });
    if (!ok) return;

    try {
      await deleteAuthUser(id);
      setUsers(users.filter((u) => u.id !== id));
      toast.success(target ? `Deleted ${target.email}` : "User deleted");
    } catch (err) {
      toast.error(`Failed to delete user: ${describeError(err)}`);
    }
  };

  // -----------------------------------------------------------------
  // Assignment loaders (existing flows, unchanged)
  // -----------------------------------------------------------------

  const loadUserFacilityAssignments = async () => {
    try {
      const assignments = await Promise.all(
        users.map(async (user) => {
          const userFacilities = await getUserFacilitiesBackend(user.id);
          return {
            id: user.id,
            userName: user.name,
            userEmail: user.email,
            facilities: userFacilities.map((f) => f.facilityName || ""),
            assignedAt: user.registeredAt,
          };
        }),
      );
      setUserFacilityAssignments(assignments);
    } catch (err) {
      console.error(
        "Error loading user facility assignments:",
        describeError(err),
      );
    }
  };

  const loadUserRoleAssignments = async () => {
    try {
      const assignments = await Promise.all(
        users.map(async (user) => {
          const userRoles = await getUserRolesBackend(user.id);
          const role = userRoles.length > 0 ? userRoles[0] : null;
          return {
            id: user.id,
            userName: user.name,
            userEmail: user.email,
            roleName: role ? role.roleName ?? "" : "No role assigned",
            roleCode: role ? role.roleCode ?? "-" : "-",
            assignedAt: user.registeredAt,
          };
        }),
      );
      setUserRoleAssignments(assignments);
    } catch (err) {
      console.error("Error loading user role assignments:", describeError(err));
    }
  };

  // -----------------------------------------------------------------
  // Facility / role assignment handlers (existing flows, modernised)
  // -----------------------------------------------------------------

  const handleAssignFacilities = async () => {
    if (!selectedUserForFacilities) {
      toast.error("Please select a user");
      return;
    }
    try {
      await setUserFacilities(selectedUserForFacilities, selectedFacilityIds);
      setSelectedUserForFacilities("");
      setSelectedFacilityIds([]);
      setShowAssignmentModal(false);
      toast.success("Facilities assigned");
      loadUserFacilityAssignments();
    } catch (err) {
      toast.error(`Failed to assign facilities: ${describeError(err)}`);
    }
  };

  const handleEditUserFacilities = async (userId: string) => {
    setSelectedUserForFacilities(userId);
    try {
      const userFacilities = await getUserFacilitiesBackend(userId);
      setSelectedFacilityIds(userFacilities.map((f) => f.id));
    } catch (err) {
      console.error("Error fetching user facilities:", describeError(err));
    }
    setShowAssignmentModal(true);
  };

  const handleAssignRoleToUser = async () => {
    if (!selectedUserForRole) {
      toast.error("Please select a user");
      return;
    }
    if (!selectedRoleForAssignment) {
      toast.error("Please select a role");
      return;
    }

    try {
      // Replace the user's roles with the single selected one. This UI is
      // one-role-per-user (the list shows userRoles[0]), so a plain
      // assignRoleToUser — which only ADDS the new role and leaves the old
      // one attached — makes "change role" look like a no-op. setUserRoles
      // does a full delete+recreate, so the change actually takes effect and
      // any stale/duplicate role is cleaned up.
      await setUserRolesBackend(selectedUserForRole, [selectedRoleForAssignment]);
      setSelectedUserForRole("");
      setSelectedRoleForAssignment("");
      setEditingUserRoleId(null);
      loadUserRoleAssignments();
      setShowRoleAssignmentModal(false);
      toast.success("Role assigned");
    } catch (err) {
      toast.error(`Failed to assign role: ${describeError(err)}`);
    }
  };

  const handleEditUserRole = async (userId: string) => {
    setSelectedUserForRole(userId);
    setEditingUserRoleId(userId);
    try {
      const userRoles = await getUserRolesBackend(userId);
      if (userRoles.length > 0) {
        setSelectedRoleForAssignment(userRoles[0].id);
      }
    } catch (err) {
      console.error("Error fetching user roles:", describeError(err));
    }
    setShowRoleAssignmentModal(true);
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  const total = users.length;
  const active = users.filter((u) => u.status === "active").length;
  const inactive = users.filter((u) => u.status === "inactive").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Supabase auth users — create, edit role, deactivate."
        icon={<Users className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total Users" value={total} />
        <StatCard label="Active Status" value={active} color="success" />
        <StatCard label="Inactive Status" value={inactive} color="warning" />
      </StatsRow>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabKey)}
      />

      {activeTab === "users" && (
        <>
          <ActionsBar>
            <PrimaryButton onClick={loadData} disabled={isLoading}>
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Loading..." : "Refresh"}
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add User
            </PrimaryButton>
          </ActionsBar>

          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted">Loading users...</p>
            </div>
          ) : (
            <UserList
              users={users}
              search={search}
              onSearchChange={setSearch}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          )}
        </>
      )}

      {activeTab === "assignments" && (
        <>
          <ActionsBar>
            <PrimaryButton
              onClick={() => {
                setSelectedUserForFacilities("");
                setSelectedFacilityIds([]);
                setShowAssignmentModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Assign Facilities
            </PrimaryButton>
          </ActionsBar>

          <UserFacilitiesList
            assignments={userFacilityAssignments}
            search={assignmentSearch}
            onSearchChange={setAssignmentSearch}
            onEdit={(assignment) => handleEditUserFacilities(assignment.id)}
            onDelete={(id) => console.log("Delete facility assignment", id)}
          />
        </>
      )}

      {activeTab === "roles" && (
        <>
          <ActionsBar>
            <PrimaryButton
              onClick={() => {
                setSelectedUserForRole("");
                setSelectedRoleForAssignment("");
                setEditingUserRoleId(null);
                setShowRoleAssignmentModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Assign Role
            </PrimaryButton>
          </ActionsBar>

          <UserRolesList
            assignments={userRoleAssignments}
            search={roleAssignmentSearch}
            onSearchChange={setRoleAssignmentSearch}
            onEdit={(assignment) => handleEditUserRole(assignment.id)}
            onDelete={(id) => console.log("Delete role assignment", id)}
          />
        </>
      )}

      {activeTab === "access" && <RolePermissionsManagement />}

      <UserDialog
        open={showModal}
        onClose={() => resetForm()}
        onSubmit={handleCreate}
        name={formName}
        onNameChange={setFormName}
        email={formEmail}
        onEmailChange={setFormEmail}
        password={formPassword}
        onPasswordChange={editingUserId ? undefined : setFormPassword}
        roles={roles}
        selectedRole={selectedUserRole}
        onRoleChange={setSelectedUserRole}
        editMode={!!editingUserId}
        isSubmitting={isSaving}
      />

      <UserFacilitiesDialog
        open={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedUserForFacilities("");
          setSelectedFacilityIds([]);
        }}
        onSubmit={handleAssignFacilities}
        users={users.map((u) => ({
          id: u.id,
          username: u.name,
          email: u.email,
          status: u.status,
          created_at: u.registeredAt,
          is_super_admin: false,
        }))}
        facilities={facilities}
        selectedUserId={selectedUserForFacilities}
        onUserChange={setSelectedUserForFacilities}
        selectedFacilityIds={selectedFacilityIds}
        onFacilityIdsChange={setSelectedFacilityIds}
      />

      <UserRolesDialog
        open={showRoleAssignmentModal}
        onClose={() => {
          setShowRoleAssignmentModal(false);
          setSelectedUserForRole("");
          setSelectedRoleForAssignment("");
          setEditingUserRoleId(null);
        }}
        onSubmit={handleAssignRoleToUser}
        users={users.map((u) => ({
          id: u.id,
          username: u.name,
          email: u.email,
          status: u.status,
          created_at: u.registeredAt,
          is_super_admin: false,
        }))}
        roles={roles}
        selectedUserId={selectedUserForRole}
        onUserChange={setSelectedUserForRole}
        selectedRoleId={selectedRoleForAssignment}
        onRoleChange={setSelectedRoleForAssignment}
        editMode={!!editingUserRoleId}
      />

      {/* Custom confirm dialog (replaces window.confirm) */}
      {confirmDialog}
    </div>
  );
};

export default UserManagement;
