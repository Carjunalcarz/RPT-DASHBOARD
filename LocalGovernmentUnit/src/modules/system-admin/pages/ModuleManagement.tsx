import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ModuleList, ModuleDialog } from "@/modules/system-admin/components";
import { PageHeader, StatsRow, StatCard } from "@/components/ui";
import { Blocks } from "lucide-react";
import { availableIcons } from "@/lib/iconMap";
import {
  getModules,
  createModule as createModuleApi,
  updateModule as updateModuleApi,
  deleteModule as deleteModuleApi,
  type BackendModule,
} from "@/services/rbacBackendService";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * ModuleManagement
 *
 * Talks to /api/v1/rbac/modules on the express-backend (Prisma over direct
 * Postgres), so it sees admin_setup regardless of whether the schema is in
 * Supabase's "Exposed schemas" PostgREST allow-list.
 *
 * The previous version had a localStorage fallback that kicked in when the
 * direct-to-Supabase write failed (PGRST106 etc). That's no longer needed
 * now that we have a working backend path — the fallback created confusing
 * shadow state where the UI showed modules that didn't exist in the DB.
 */

interface Module {
  id: string;
  module_name: string;
  route_path: string;
  icons: string | null;
  file_path: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
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

function toUiModule(m: BackendModule): Module {
  return {
    id: m.id,
    module_name: m.moduleName ?? "",
    route_path: m.routePath ?? "",
    icons: m.icons ?? null,
    file_path: m.filePath ?? null,
    category: m.category ?? null,
    is_active: !!m.isActive,
    created_at: m.createdAt ?? "",
  };
}

const ModuleManagement = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState("");
  const [routePath, setRoutePath] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [filePath, setFilePath] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      // includeInactive=true so admins see all modules, active or not.
      const list = await getModules(true);
      setModules(list.map(toUiModule));
    } catch (err) {
      const msg = describeError(err);
      console.error("Fetch modules error:", msg);
      toast.error(`Failed to load modules: ${msg}`);
    }
  };

  const resetForm = () => {
    setModuleName("");
    setRoutePath("");
    setSelectedIcon("");
    setFilePath("");
    setCategory("");
    setIsActive(true);
    setEditingModuleId(null);
    setShowModal(false);
  };

  const handleCreate = async () => {
    if (
      !moduleName.trim() ||
      !routePath.trim() ||
      !filePath.trim() ||
      !category.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      if (editingModuleId) {
        const updated = await updateModuleApi(editingModuleId, {
          moduleName: moduleName.trim(),
          routePath: routePath.trim(),
          icons: selectedIcon || null,
          filePath: filePath.trim(),
          category: category.trim() || null,
          isActive,
        });
        setModules(
          modules.map((m) =>
            m.id === editingModuleId ? toUiModule(updated) : m,
          ),
        );
        toast.success(
          `Module "${updated.moduleName ?? moduleName}" updated`,
        );
      } else {
        const created = await createModuleApi({
          moduleName: moduleName.trim(),
          routePath: routePath.trim(),
          icons: selectedIcon || null,
          filePath: filePath.trim(),
          category: category.trim() || null,
          isActive,
        });
        setModules([toUiModule(created), ...modules]);
        toast.success(
          `Module "${created.moduleName ?? moduleName}" created`,
        );
      }

      resetForm();
    } catch (err) {
      console.error("Save module error:", err);
      toast.error(`Failed to save module: ${describeError(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = modules.find((m) => m.id === id);
    const ok = await confirm({
      title: "Delete module?",
      message: target
        ? `Delete module "${target.module_name}" (${target.route_path})? ` +
          "Any role permissions referencing this module will cascade-delete. " +
          "This cannot be undone."
        : "Delete this module? This cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await deleteModuleApi(id);
      setModules(modules.filter((m) => m.id !== id));
      toast.success(
        target ? `Deleted "${target.module_name}"` : "Module deleted",
      );
    } catch (err) {
      console.error("Delete module error:", err);
      toast.error(`Failed to delete module: ${describeError(err)}`);
    }
  };

  const handleEdit = (module: Module) => {
    setModuleName(module.module_name);
    setRoutePath(module.route_path);
    setSelectedIcon(module.icons || "");
    setFilePath(module.file_path || "");
    setCategory(module.category || "");
    setIsActive(module.is_active);
    setEditingModuleId(module.id);
    setShowModal(true);
  };

  const openCreateDialog = () => {
    setModuleName("");
    setRoutePath("");
    setSelectedIcon("");
    setFilePath("");
    setCategory("");
    setIsActive(true);
    setEditingModuleId(null);
    setShowModal(true);
  };

  const total = modules.length;
  const active = modules.filter((m) => m.is_active).length;
  const inactive = modules.filter((m) => !m.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module Management"
        subtitle="Manage modules in your role-based access control system"
        icon={<Blocks className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total Modules" value={total} />
        <StatCard label="Active Status" value={active} color="success" />
        <StatCard label="Inactive Status" value={inactive} color="warning" />
      </StatsRow>

      <ModuleList
        modules={modules}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateDialog}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ModuleDialog
        open={showModal}
        onClose={resetForm}
        onSubmit={handleCreate}
        moduleName={moduleName}
        onModuleNameChange={setModuleName}
        routePath={routePath}
        onRoutePathChange={setRoutePath}
        selectedIcon={selectedIcon}
        onSelectedIconChange={setSelectedIcon}
        filePath={filePath}
        onFilePathChange={setFilePath}
        category={category}
        onCategoryChange={setCategory}
        isActive={isActive}
        onIsActiveChange={setIsActive}
        availableIcons={availableIcons}
        isLoading={isLoading}
        editMode={!!editingModuleId}
      />

      {/* Custom confirm dialog (replaces window.confirm) */}
      {confirmDialog}
    </div>
  );
};

export default ModuleManagement;
