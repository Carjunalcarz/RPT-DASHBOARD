import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useModulePermissions } from '@/hooks/useRBAC';
import {
  createResponsibilityCenterSection,
  deleteResponsibilityCenterSection,
  getResponsibilityCenters,
  getResponsibilityCenterSections,
  updateResponsibilityCenterSection,
  type ResponsibilityCenter,
  type ResponsibilityCenterSection,
} from '@/services/accountingService';
import { ResponsibilityCenterSectionDialog } from './ResponsibilityCenterSectionDialog';

interface ResponsibilityCenterSectionListProps {
  selectedCenterId?: string;
  onSelectedCenterChange?: (centerId: string) => void;
}

const getCenterLabel = (center: ResponsibilityCenter): string => {
  const code = center.rc_code || center.code || '';
  const description = center.description || center.name || '';

  if (code && description) return `${code} - ${description}`;
  if (description) return description;
  if (code) return code;
  return center.id;
};

export const ResponsibilityCenterSectionList = ({
  selectedCenterId,
  onSelectedCenterChange,
}: ResponsibilityCenterSectionListProps) => {
  const [centers, setCenters] = useState<ResponsibilityCenter[]>([]);
  const [sections, setSections] = useState<ResponsibilityCenterSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<ResponsibilityCenterSection | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const permissions = useModulePermissions('/accounting/account-groups');
  const canCreate = permissions.canInsert;
  const canRead = permissions.canSelect;
  const canUpdate = permissions.canUpdate;
  const canDelete = permissions.canDelete;

  const loadData = async () => {
    try {
      setLoading(true);
      const [centerData, sectionData] = await Promise.all([
        getResponsibilityCenters(),
        getResponsibilityCenterSections(),
      ]);
      setCenters(centerData);
      setSections(sectionData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (formData: {
    rcs_code: string;
    description: string;
    rc_id: string;
    is_active: boolean;
  }) => {
    try {
      if (editingData) {
        await updateResponsibilityCenterSection(editingData.id, formData);
      } else {
        await createResponsibilityCenterSection(formData);
      }

      setDialogOpen(false);
      setEditingData(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      await deleteResponsibilityCenterSection(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const centerMap = useMemo(
    () => new Map(centers.map((center) => [center.id, center])),
    [centers]
  );

  const filteredSections = useMemo(() => {
    const q = searchTerm.toLowerCase();

    return sections.filter((section) => {
      const center = centerMap.get(section.rc_id);
      const centerLabel = center ? getCenterLabel(center).toLowerCase() : '';
      const matchCenter = !selectedCenterId || section.rc_id === selectedCenterId;
      const matchSearch =
        section.rcs_code.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q) ||
        centerLabel.includes(q);

      return matchCenter && matchSearch;
    });
  }, [centerMap, searchTerm, sections, selectedCenterId]);

  if (loading) return <div className="p-4 text-center">Loading responsibility center sections...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view responsibility center sections</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2">
          <select
            id="rc-section-center-filter"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            value={selectedCenterId || ''}
            onChange={(e) => onSelectedCenterChange?.(e.target.value)}
          >
            <option value="">All Responsibility Centers</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {getCenterLabel(center)}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by code, description, or center..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
          />

          <button
            type="button"
            onClick={() => {
              onSelectedCenterChange?.('');
              setSearchTerm('');
            }}
            className="px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingData(null);
                setDialogOpen(true);
              }}
              className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Section Code</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Responsibility Center</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                  No responsibility center sections found
                </td>
              </tr>
            ) : (
              filteredSections.map((section) => {
                const center = centerMap.get(section.rc_id);

                return (
                  <tr key={section.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs sm:text-sm">{section.rcs_code}</td>
                    <td className="px-4 py-3 font-medium">{center ? getCenterLabel(center) : section.rc_id}</td>
                    <td className="px-4 py-3 font-medium">{section.description}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          section.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {section.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingData(section);
                            setDialogOpen(true);
                          }}
                          className="p-1 hover:bg-muted rounded text-foreground"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(section.id)}
                          className="p-1 hover:bg-danger/20 rounded text-danger"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ResponsibilityCenterSectionDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        centers={centers}
        defaultCenterId={selectedCenterId}
        editingData={editingData}
        error={error}
      />
    </div>
  );
};
