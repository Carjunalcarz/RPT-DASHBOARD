import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  StatsRow,
  StatCard,
  ActionsBar,
  PrimaryButton,
} from "@/components/ui";
import { Settings, RefreshCw, Save } from "lucide-react";
import {
  getRoles,
  getRole,
  getModules,
  setRoleModules,
  type BackendRole,
  type BackendModule,
} from "@/services/rbacBackendService";

/**
 * RoleModuleAccessManagement
 *
 * Backend-driven. Reads roles + modules via /api/v1/rbac/{roles,modules},
 * reads a role's current modules via GET /api/v1/rbac/roles/:id (the
 * response includes the role's enriched modules list), and writes via
 * PUT /api/v1/rbac/roles/:id/modules (passes module ids — backend grants
 * full CRUD on each, semantics unchanged from the previous direct-Supabase
 * implementation).
 *
 * No more PGRST106 — the express-backend uses Prisma over a direct Postgres
 * connection and reads admin_setup regardless of Supabase's exposed-schemas
 * allow-list.
 */

const RoleModuleAccessManagement = () => {
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [modules, setModules] = useState<BackendModule[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadRoleModules(selectedRoleId);
    } else {
      setSelectedModules([]);
    }
  }, [selectedRoleId]);

  const describeError = (err: unknown): string => {
    const e = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return (
      e?.response?.data?.message ||
      e?.message ||
      (typeof err === "string" ? err : "Unknown error")
    );
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedRoles, fetchedModules] = await Promise.all([
        getRoles(),
        getModules(true), // include inactive so admins can grant access to anything
      ]);
      setRoles(fetchedRoles);
      setModules(fetchedModules);
    } catch (err) {
      toast.error(`Failed to load data: ${describeError(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoleModules = async (roleId: string) => {
    try {
      // getRole returns the role with its enriched modules array. Each entry
      // is a Module shape with canSelect/canInsert/canUpdate/canDelete on
      // top — for THIS page we only care about presence, treating it as
      // "this role can see this module".
      const role = await getRole(roleId);
      setSelectedModules((role.modules || []).map((m) => m.id));
    } catch (err) {
      console.error("Error loading role modules:", describeError(err));
      setSelectedModules([]);
      toast.error(`Failed to load role modules: ${describeError(err)}`);
    }
  };

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      toast.error("Please select a role first");
      return;
    }

    setIsSaving(true);
    try {
      // Pass module ids (strings) — backend grants full CRUD on each.
      await setRoleModules(selectedRoleId, selectedModules);
      toast.success("Module access updated");
    } catch (err) {
      toast.error(`Failed to update module access: ${describeError(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Module Access"
        subtitle="Assign modules and permissions to roles"
        icon={<Settings className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total Roles" value={roles.length} />
        <StatCard label="Total Modules" value={modules.length} />
        <StatCard
          label="Selected Modules"
          value={selectedModules.length}
          color={selectedModules.length > 0 ? "success" : "warning"}
        />
      </StatsRow>

      <ActionsBar>
        <PrimaryButton onClick={loadData} disabled={isLoading}>
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Loading..." : "Refresh"}
        </PrimaryButton>
      </ActionsBar>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Role Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Select Role</h3>
            <select
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">-- Choose a role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.roleName || role.roleCode || role.id}
                </option>
              ))}
            </select>

            {selectedRole && (
              <div className="text-sm space-y-1 pt-3 border-t border-border">
                <p className="text-muted">Selected:</p>
                <p className="font-medium text-foreground">
                  {selectedRole.roleName || "(unnamed)"}
                </p>
                <p className="text-xs text-muted uppercase">
                  {selectedRole.roleCode || "—"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modules List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Available Modules
              </h3>
              <span className="text-xs font-medium text-muted bg-background px-2 py-1 rounded">
                {selectedModules.length} selected
              </span>
            </div>

            {isLoading ? (
              <p className="text-center text-muted py-8">Loading modules...</p>
            ) : modules.length === 0 ? (
              <p className="text-center text-muted py-8">No modules available</p>
            ) : (
              <div className="space-y-3">
                {modules.map((module) => (
                  <label
                    key={module.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-background/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={() => handleModuleToggle(module.id)}
                      disabled={!selectedRoleId || isLoading}
                      className="w-4 h-4 rounded border-border text-success"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {module.moduleName || "(unnamed)"}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {module.routePath || ""}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedRoleId && (
            <div className="flex justify-end gap-3">
              <PrimaryButton onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleModuleAccessManagement;
