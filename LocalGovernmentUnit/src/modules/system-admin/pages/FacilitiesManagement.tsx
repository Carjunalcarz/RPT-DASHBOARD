import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FacilitiesList,
  FacilitiesDialog,
} from "@/modules/system-admin/components";
import {
  PageHeader,
  StatsRow,
  StatCard,
  ActionsBar,
  PrimaryButton,
} from "@/components/ui";
import { Building, Plus } from "lucide-react";
import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
  type BackendFacility,
} from "@/services/rbacBackendService";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * FacilitiesManagement
 *
 * Talks to /api/v1/rbac/facilities on the express-backend rather than going
 * direct to Supabase via supabase-js. This bypasses the PGRST106 "Invalid
 * schema" error that supabase-js throws when admin_setup isn't in the
 * project's Exposed Schemas list.
 */

interface Facility {
  id: string;
  facility_name: string;
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

function toUiFacility(f: BackendFacility): Facility {
  return {
    id: f.id,
    facility_name: f.facilityName ?? "",
    is_active: !!f.isActive,
    created_at: f.createdAt ?? "",
  };
}

const FacilitiesManagement = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [facilityName, setFacilityName] = useState("");
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(
    null,
  );
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      const list = await getFacilities();
      setFacilities(list.map(toUiFacility));
    } catch (err) {
      const msg = describeError(err);
      console.error("Error loading facilities:", msg);
      toast.error(`Failed to load facilities: ${msg}`);
    }
  };

  const handleCreate = async () => {
    if (!facilityName.trim()) {
      toast.error("Please fill in facility name");
      return;
    }

    try {
      if (editingFacilityId) {
        const updated = await updateFacility(editingFacilityId, {
          facilityName,
        });
        setFacilities(
          facilities.map((f) =>
            f.id === editingFacilityId ? toUiFacility(updated) : f,
          ),
        );
        toast.success(`Facility "${updated.facilityName ?? facilityName}" updated`);
      } else {
        const created = await createFacility({
          facilityName,
          isActive: true,
        });
        setFacilities([...facilities, toUiFacility(created)]);
        toast.success(`Facility "${created.facilityName ?? facilityName}" created`);
      }

      setFacilityName("");
      setEditingFacilityId(null);
      setShowModal(false);
    } catch (err) {
      console.error("Error saving facility:", err);
      toast.error(`Failed to save facility: ${describeError(err)}`);
    }
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacilityId(facility.id);
    setFacilityName(facility.facility_name);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const target = facilities.find((f) => f.id === id);
    const ok = await confirm({
      title: "Delete facility?",
      message: target
        ? `Delete facility "${target.facility_name}"? ` +
          "Any user-facility assignments referencing it will cascade-delete. " +
          "This cannot be undone."
        : "Delete this facility? This cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await deleteFacility(id);
      setFacilities(facilities.filter((f) => f.id !== id));
      toast.success(
        target ? `Deleted "${target.facility_name}"` : "Facility deleted",
      );
    } catch (err) {
      console.error("Error deleting facility:", err);
      toast.error(`Failed to delete facility: ${describeError(err)}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFacilityName("");
    setEditingFacilityId(null);
  };

  const total = facilities.length;
  const active = facilities.filter((f) => f.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities Management"
        subtitle="Manage facilities in your role-based access control system"
        icon={<Building className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total Facilities" value={total} />
        <StatCard label="Active Facilities" value={active} color="success" />
      </StatsRow>

      <ActionsBar>
        <PrimaryButton
          onClick={() => {
            setEditingFacilityId(null);
            setFacilityName("");
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Facility
        </PrimaryButton>
      </ActionsBar>

      <FacilitiesList
        facilities={facilities}
        search={search}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FacilitiesDialog
        open={showModal}
        onClose={handleCloseModal}
        onSubmit={handleCreate}
        facilityName={facilityName}
        onFacilityNameChange={setFacilityName}
        editMode={editingFacilityId !== null}
      />

      {/* Custom confirm dialog (replaces window.confirm) */}
      {confirmDialog}
    </div>
  );
};

export default FacilitiesManagement;
