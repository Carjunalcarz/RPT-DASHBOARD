import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  StatsRow,
  StatCard,
  ActionsBar,
  PrimaryButton,
} from "@/components/ui";
import { BaseDialog } from "@/components/ui/dialog";
import { Shield, RefreshCw, Search, Pencil, Trash2 } from "lucide-react";
import {
  getRoles,
  getRole,
  getModules,
  upsertRoleModule,
  removeRoleModule,
  type BackendRole,
  type BackendModule,
} from "@/services/rbacBackendService";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * RolePermissionsManagement
 *
 * Backend-driven. Reads everything via /api/v1/rbac/* and writes per-module
 * CRUD flags via the granular PUT /api/v1/rbac/roles/:roleId/modules/:moduleId
 * endpoint (one row at a time). The previous version used Supabase REST via
 * adminTable() which tripped PGRST106 whenever admin_setup wasn't in the
 * Exposed Schemas list.
 *
 * Local state shape mirrors the rolePermissions Map from the old version
 * but stores BackendModule rows (with canSelect/canInsert/canUpdate/canDelete
 * already present on each) instead of raw role_permission rows.
 */

interface UiPerm {
  moduleId: string;
  moduleName: string;
  routePath: string;
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

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

function moduleToUiPerm(m: BackendModule): UiPerm {
  return {
    moduleId: m.id,
    moduleName: m.moduleName || "(unnamed)",
    routePath: m.routePath || "",
    canSelect: !!m.canSelect,
    canInsert: !!m.canInsert,
    canUpdate: !!m.canUpdate,
    canDelete: !!m.canDelete,
  };
}

const RolePermissionManagement = () => {
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [modules, setModules] = useState<BackendModule[]>([]);
  const [rolePerms, setRolePerms] = useState<Map<string, UiPerm[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Search / expand state
  const [roleSearch, setRoleSearch] = useState("");
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingExisting, setEditingExisting] = useState(false);
  const [dialogRoleId, setDialogRoleId] = useState("");
  const [dialogModuleIds, setDialogModuleIds] = useState<string[]>([]);
  const [dialogModuleSearch, setDialogModuleSearch] = useState("");
  const [dialogCanSelect, setDialogCanSelect] = useState(false);
  const [dialogCanInsert, setDialogCanInsert] = useState(false);
  const [dialogCanUpdate, setDialogCanUpdate] = useState(false);
  const [dialogCanDelete, setDialogCanDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { confirm, dialog: confirmDialog } = useConfirm();

  // -----------------------------------------------------------------
  // Load
  // -----------------------------------------------------------------

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedRoles, fetchedModules] = await Promise.all([
        getRoles(),
        getModules(true),
      ]);
      setRoles(fetchedRoles);
      setModules(fetchedModules);

      // Read each role's per-module CRUD flags. GET /roles/:id returns the
      // role with its enriched modules array (only modules that have at
      // least one CRUD bit set), so each entry already includes
      // canSelect/canInsert/canUpdate/canDelete.
      const next = new Map<string, UiPerm[]>();
      await Promise.all(
        fetchedRoles.map(async (role) => {
          try {
            const detail = await getRole(role.id);
            next.set(role.id, (detail.modules || []).map(moduleToUiPerm));
          } catch (err) {
            console.error(
              `getRole(${role.id}) failed:`,
              describeError(err),
            );
            next.set(role.id, []);
          }
        }),
      );
      setRolePerms(next);

      // Expand all roles by default — matches previous UX.
      setExpandedRoles(new Set(fetchedRoles.map((r) => r.id)));
    } catch (err) {
      toast.error(`Failed to load data: ${describeError(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------

  const getModuleName = useCallback(
    (moduleId: string) =>
      modules.find((m) => m.id === moduleId)?.moduleName ?? moduleId,
    [modules],
  );

  const getModuleRoutePath = useCallback(
    (moduleId: string) =>
      modules.find((m) => m.id === moduleId)?.routePath ?? "",
    [modules],
  );

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(
      (r) =>
        (r.roleName ?? "").toLowerCase().includes(q) ||
        (r.roleCode ?? "").toLowerCase().includes(q),
    );
  }, [roles, roleSearch]);

  const getAvailableModules = useCallback(
    (roleId: string) => {
      const existingIds = (rolePerms.get(roleId) || []).map(
        (p) => p.moduleId,
      );
      return modules.filter((m) => !existingIds.includes(m.id));
    },
    [modules, rolePerms],
  );

  const filteredDialogModules = useMemo(() => {
    const available = editingExisting
      ? modules // when editing, show all so the source module shows up
      : getAvailableModules(dialogRoleId);

    if (!dialogModuleSearch.trim()) return available;
    const q = dialogModuleSearch.toLowerCase();
    return available.filter(
      (m) =>
        (m.moduleName ?? "").toLowerCase().includes(q) ||
        (m.routePath ?? "").toLowerCase().includes(q),
    );
  }, [
    modules,
    dialogRoleId,
    dialogModuleSearch,
    editingExisting,
    getAvailableModules,
  ]);

  const totalAssignments = Array.from(rolePerms.values()).reduce(
    (acc, perms) => acc + perms.length,
    0,
  );

  const getRoleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.roleName ?? "";

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------

  const toggleRole = (roleId: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const openAddDialog = (roleId: string) => {
    setDialogRoleId(roleId);
    setDialogModuleIds([]);
    setDialogModuleSearch("");
    setDialogCanSelect(false);
    setDialogCanInsert(false);
    setDialogCanUpdate(false);
    setDialogCanDelete(false);
    setEditingExisting(false);
    setShowDialog(true);
  };

  const openEditDialog = (roleId: string, perm: UiPerm) => {
    setDialogRoleId(roleId);
    setDialogModuleIds([perm.moduleId]);
    setDialogModuleSearch("");
    setDialogCanSelect(perm.canSelect);
    setDialogCanInsert(perm.canInsert);
    setDialogCanUpdate(perm.canUpdate);
    setDialogCanDelete(perm.canDelete);
    setEditingExisting(true);
    setShowDialog(true);
  };

  const handleDialogModuleToggle = (moduleId: string) => {
    if (editingExisting) return; // can't change module when editing
    setDialogModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const handleSavePermission = async () => {
    if (dialogModuleIds.length === 0) {
      toast.error("Please select at least one module");
      return;
    }
    if (
      !dialogCanSelect &&
      !dialogCanInsert &&
      !dialogCanUpdate &&
      !dialogCanDelete
    ) {
      toast.error("Please select at least one permission");
      return;
    }

    setIsSaving(true);
    try {
      for (const moduleId of dialogModuleIds) {
        await upsertRoleModule(dialogRoleId, moduleId, {
          canSelect: dialogCanSelect,
          canInsert: dialogCanInsert,
          canUpdate: dialogCanUpdate,
          canDelete: dialogCanDelete,
        });
      }
      toast.success(
        dialogModuleIds.length > 1
          ? `${dialogModuleIds.length} permissions saved`
          : "Permission saved",
      );
      setShowDialog(false);
      await loadData();
    } catch (err) {
      toast.error(`Failed to save permission: ${describeError(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePermission = async (roleId: string, moduleId: string) => {
    const moduleName = getModuleName(moduleId);
    const roleName = getRoleName(roleId);
    const ok = await confirm({
      title: "Remove module access?",
      message:
        `Remove "${moduleName}" access from role "${roleName}"? ` +
        "Any users in this role will lose all CRUD permissions on this module.",
      variant: "destructive",
      confirmLabel: "Remove",
    });
    if (!ok) return;

    try {
      await removeRoleModule(roleId, moduleId);
      toast.success(`Removed "${moduleName}" from ${roleName}`);
      await loadData();
    } catch (err) {
      toast.error(`Failed to remove permission: ${describeError(err)}`);
    }
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  const PermissionBadge = ({
    enabled,
    label,
  }: {
    enabled: boolean;
    label: string;
  }) => (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
        enabled
          ? "bg-success/10 text-success border-success/30"
          : "bg-muted/10 text-muted border-border opacity-50"
      }`}
    >
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Permissions"
        subtitle="Manage module access and CRUD permissions for each role"
        icon={<Shield className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total Roles" value={roles.length} />
        <StatCard label="Total Modules" value={modules.length} />
        <StatCard
          label="Total Assignments"
          value={totalAssignments}
          color={totalAssignments > 0 ? "success" : "warning"}
        />
      </StatsRow>

      <ActionsBar>
        <PrimaryButton onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </PrimaryButton>
      </ActionsBar>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search roles..."
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success"
        />
      </div>

      {/* Roles & Permissions List */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-background/50 border-b border-border">
          <div className="col-span-2 text-sm font-semibold text-foreground">
            Role
          </div>
          <div className="col-span-9 text-sm font-semibold text-foreground">
            Modules & Permissions
          </div>
          <div className="col-span-1 text-sm font-semibold text-foreground text-right">
            Actions
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-muted">Loading...</div>
        ) : filteredRoles.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted">No roles found</div>
        ) : (
          filteredRoles.map((role) => {
            const perms = rolePerms.get(role.id) || [];
            const isExpanded = expandedRoles.has(role.id);

            return (
              <div key={role.id} className="border-b border-border last:border-0">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-background/30">
                  <div className="col-span-2">
                    <button
                      onClick={() => toggleRole(role.id)}
                      className="text-left w-full"
                    >
                      <p className="font-semibold text-foreground">
                        {role.roleName || "(unnamed)"}
                      </p>
                      <p className="text-xs text-muted">{perms.length} modules</p>
                    </button>
                  </div>

                  <div className="col-span-9 space-y-3">
                    {perms.length === 0 ? (
                      <p className="text-sm text-muted italic">
                        No modules assigned
                      </p>
                    ) : isExpanded ? (
                      perms.map((perm) => (
                        <div
                          key={perm.moduleId}
                          className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {perm.moduleName}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {perm.routePath}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <PermissionBadge enabled={perm.canInsert} label="Create" />
                            <PermissionBadge enabled={perm.canSelect} label="Read" />
                            <PermissionBadge enabled={perm.canUpdate} label="Update" />
                            <PermissionBadge enabled={perm.canDelete} label="Delete" />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditDialog(role.id, perm)}
                              className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeletePermission(role.id, perm.moduleId)
                              }
                              className="p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">
                        Click to expand {perms.length} module(s)
                      </p>
                    )}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => openAddDialog(role.id)}
                      className="px-3 py-1.5 text-xs font-medium text-success border border-success/30 rounded-lg hover:bg-success/10 transition-colors"
                    >
                      Add Module
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <BaseDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title={
          editingExisting
            ? `Edit Module Access for Role: ${getRoleName(dialogRoleId)}`
            : `Create Module Access for Role: ${getRoleName(dialogRoleId)}`
        }
        onSubmit={handleSavePermission}
        submitLabel={editingExisting ? "Save Changes" : "Create Access Rule"}
        isLoading={isSaving}
      >
        <div className="space-y-5">
          {/* Module Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {editingExisting ? "Module" : "Modules (select one or more)"}
            </label>

            {editingExisting ? (
              <div className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted">
                {dialogModuleIds[0] && getModuleName(dialogModuleIds[0])}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={dialogModuleSearch}
                    onChange={(e) => setDialogModuleSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                  {filteredDialogModules.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted text-center">
                      No available modules
                    </p>
                  ) : (
                    filteredDialogModules.map((mod) => (
                      <label
                        key={mod.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-background/70 cursor-pointer border-b border-border/50 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={dialogModuleIds.includes(mod.id)}
                          onChange={() => handleDialogModuleToggle(mod.id)}
                          className="w-4 h-4 rounded border-border text-success"
                        />
                        <span className="text-sm text-foreground">
                          {mod.moduleName}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Permissions
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dialogCanSelect}
                  onChange={(e) => setDialogCanSelect(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-success"
                />
                <span className="text-sm text-foreground">Select (Read)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dialogCanInsert}
                  onChange={(e) => setDialogCanInsert(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-success"
                />
                <span className="text-sm text-foreground">Insert (Create)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dialogCanUpdate}
                  onChange={(e) => setDialogCanUpdate(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-success"
                />
                <span className="text-sm text-foreground">Update (Modify)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dialogCanDelete}
                  onChange={(e) => setDialogCanDelete(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-success"
                />
                <span className="text-sm text-foreground">Delete (Remove)</span>
              </label>
            </div>
          </div>
        </div>
      </BaseDialog>

      {/* Custom confirm dialog (replaces window.confirm) */}
      {confirmDialog}
    </div>
  );
};

export default RolePermissionManagement;
