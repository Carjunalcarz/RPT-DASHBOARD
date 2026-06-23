import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RoleList, RoleDialog } from "@/modules/system-admin/components";
import {
  PageHeader,
  StatsRow,
  StatCard,
  ActionsBar,
  PrimaryButton,
} from "@/components/ui";
import { Shield, Plus } from "lucide-react";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type BackendRole,
} from "@/services/rbacBackendService";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * RoleManagement
 *
 * Talks to the express-backend's /api/v1/rbac/* endpoints (NOT supabase-js
 * direct). The backend uses Prisma with a direct Postgres connection, which
 * reads any schema regardless of Supabase's "Exposed schemas" PostgREST gate.
 * This bypasses the PGRST106 trap that supabase-js hits when the system-admin
 * schema isn't exposed.
 *
 * Auth: requests carry the access_token cookie (or Bearer JWT) set by
 * authStore.login, and the API key as a fallback. The backend rbac routes
 * require super_admin for mutations; service-key requests bypass.
 */

interface Role {
  id: string;
  role_name: string;
  role_code: string;
  created_at: string;
}

function describeError(err: unknown): string {
  if (!err) return "Unknown error";
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    e?.response?.data?.message ||
    e?.message ||
    (typeof err === "string" ? err : JSON.stringify(err))
  );
}

function toUiRole(r: BackendRole): Role {
  return {
    id: r.id,
    role_name: r.roleName ?? "",
    role_code: r.roleCode ?? "",
    created_at: r.createdAt ?? "",
  };
}

const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const list = await getRoles();
      setRoles(list.map(toUiRole));
    } catch (err) {
      const msg = describeError(err);
      console.error("Error loading roles:", msg);
      toast.error(`Failed to load roles: ${msg}`);
    }
  };

  const handleCreate = async () => {
    if (!roleName.trim() || !roleCode.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingRoleId) {
        const updated = await updateRole(editingRoleId, {
          roleName,
          // The backend treats roleCode as a stable code, but we keep the
          // legacy "uppercase on save" behaviour for compatibility with
          // anything still reading these codes in caps.
          roleCode: roleCode.toUpperCase(),
        });
        setRoles(
          roles.map((r) => (r.id === editingRoleId ? toUiRole(updated) : r)),
        );
        toast.success(`Role "${updated.roleName ?? roleName}" updated`);
      } else {
        const created = await createRole({
          roleName,
          roleCode: roleCode.toUpperCase(),
        });
        setRoles([...roles, toUiRole(created)]);
        toast.success(`Role "${created.roleName ?? roleName}" created`);
      }

      setRoleName("");
      setRoleCode("");
      setEditingRoleId(null);
      setShowModal(false);
    } catch (err) {
      console.error("Error saving role:", err);
      toast.error(`Failed to save role: ${describeError(err)}`);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.role_name);
    setRoleCode(role.role_code);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const target = roles.find((r) => r.id === id);
    const ok = await confirm({
      title: "Delete role?",
      message: target
        ? `Delete role "${target.role_name}" (${target.role_code})? ` +
          "This cannot be undone, and any users currently assigned this " +
          "role will lose its permissions."
        : "Delete this role? This cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await deleteRole(id);
      setRoles(roles.filter((r) => r.id !== id));
      toast.success(target ? `Deleted "${target.role_name}"` : "Role deleted");
    } catch (err) {
      console.error("Error deleting role:", err);
      toast.error(`Failed to delete role: ${describeError(err)}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setRoleName("");
    setRoleCode("");
    setEditingRoleId(null);
  };

  const total = roles.length;
  const active = roles.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Management"
        subtitle="Manage roles in your role-based access control system"
        icon={<Shield className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total Roles" value={total} />
        <StatCard label="Active Roles" value={active} color="success" />
      </StatsRow>

      <ActionsBar>
        <PrimaryButton
          onClick={() => {
            setEditingRoleId(null);
            setRoleName("");
            setRoleCode("");
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Create Role
        </PrimaryButton>
      </ActionsBar>

      <RoleList
        roles={roles}
        search={search}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <RoleDialog
        open={showModal}
        onClose={handleCloseModal}
        onSubmit={handleCreate}
        roleName={roleName}
        onRoleNameChange={setRoleName}
        roleCode={roleCode}
        onRoleCodeChange={setRoleCode}
        editMode={editingRoleId !== null}
      />

      {/* Custom confirm dialog (replaces window.confirm) */}
      {confirmDialog}
    </div>
  );
};

export default RoleManagement;
