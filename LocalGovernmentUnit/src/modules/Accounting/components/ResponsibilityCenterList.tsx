import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useModulePermissions } from '@/hooks/useRBAC';
import {
  createResponsibilityCenter,
  createResponsibilityCenterSection,
  deleteResponsibilityCenter,
  deleteResponsibilityCenterSection,
  getResponsibilityCenters,
  getResponsibilityCenterSections,
  updateResponsibilityCenterSection,
  updateResponsibilityCenter,
  type ResponsibilityCenter,
  type ResponsibilityCenterSection,
} from '@/services/accountingService';
import {
  ResponsibilityCenterDialog,
  type ResponsibilityCenterSectionFormItem,
} from './ResponsibilityCenterDialog';

const getCenterCode = (center: ResponsibilityCenter) => center.rc_code || center.code || '-';
const getCenterDescription = (center: ResponsibilityCenter) => center.description || center.name || '-';

const getSectionLabel = (section: ResponsibilityCenterSection) =>
  `${section.rcs_code} - ${section.description}`;

export const ResponsibilityCenterList = () => {
  const ITEMS_PER_PAGE = 10;

  const [centers, setCenters] = useState<ResponsibilityCenter[]>([]);
  const [sections, setSections] = useState<ResponsibilityCenterSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<ResponsibilityCenter | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
      setError(err instanceof Error ? err.message : 'Failed to load responsibility centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (formData: {
    rc_code: string;
    description: string;
    is_active: boolean;
    sections: ResponsibilityCenterSectionFormItem[];
  }) => {
    try {
      if (editingData) {
        const updated = await updateResponsibilityCenter(editingData.id, {
          rc_code: formData.rc_code,
          description: formData.description,
          is_active: formData.is_active,
        });

        for (const section of formData.sections) {
          if (section.id && section.markedForDelete) {
            await deleteResponsibilityCenterSection(section.id);
            continue;
          }

          if (section.id) {
            await updateResponsibilityCenterSection(section.id, {
              rcs_code: section.rcs_code,
              description: section.description,
              rc_id: updated.id,
              is_active: section.is_active,
            });
            continue;
          }

          if (!section.markedForDelete) {
            await createResponsibilityCenterSection({
              rcs_code: section.rcs_code,
              description: section.description,
              rc_id: updated.id,
              is_active: section.is_active,
            });
          }
        }
      } else {
        const created = await createResponsibilityCenter({
          rc_code: formData.rc_code,
          description: formData.description,
          is_active: formData.is_active,
        });

        for (const section of formData.sections) {
          if (section.markedForDelete) continue;

          await createResponsibilityCenterSection({
            rcs_code: section.rcs_code,
            description: section.description,
            rc_id: created.id,
            is_active: section.is_active,
          });
        }
      }

      setDialogOpen(false);
      setEditingData(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this responsibility center?')) return;

    try {
      await deleteResponsibilityCenter(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const sectionsByCenter = useMemo(() => {
    const map = new Map<string, ResponsibilityCenterSection[]>();

    for (const section of sections) {
      if (!map.has(section.rc_id)) map.set(section.rc_id, []);
      map.get(section.rc_id)?.push(section);
    }

    return map;
  }, [sections]);

  const filteredCenters = useMemo(
    () =>
      centers.filter((center) => {
        const code = getCenterCode(center).toLowerCase();
        const description = getCenterDescription(center).toLowerCase();
        const sectionText = (sectionsByCenter.get(center.id) || [])
          .map((section) => `${section.rcs_code} ${section.description}`.toLowerCase())
          .join(' ');
        const q = searchTerm.toLowerCase();

        return code.includes(q) || description.includes(q) || sectionText.includes(q);
      }),
    [centers, searchTerm, sectionsByCenter]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCenters.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCenters = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCenters.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCenters, safeCurrentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) return <div className="p-4 text-center">Loading responsibility centers...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view responsibility centers</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Search by code or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
        />
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingData(null);
              setDialogOpen(true);
            }}
            className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Responsibility Center
          </button>
        )}
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
              <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Sections</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCenters.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                  No responsibility centers found
                </td>
              </tr>
            ) : (
              paginatedCenters.map((center) => {
                const isActive = center.is_active ?? true;
                const centerSections = sectionsByCenter.get(center.id) || [];

                return (
                  <tr key={center.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs sm:text-sm">{getCenterCode(center)}</td>
                    <td className="px-4 py-3 font-medium">{getCenterDescription(center)}</td>
                    <td className="px-4 py-3">
                      {centerSections.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No sections</span>
                      ) : (
                        <ul className="space-y-1">
                          {centerSections.map((section) => (
                            <li
                              key={section.id}
                              className={`text-xs ${
                                section.is_active ? 'text-foreground' : 'text-muted-foreground'
                              }`}
                              title={getSectionLabel(section)}
                            >
                              {getSectionLabel(section)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          isActive ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingData(center);
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
                          onClick={() => handleDelete(center.id)}
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

      {filteredCenters.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <div>
            Showing {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredCenters.length)} of {filteredCenters.length}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="px-2.5 py-1.5 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((page) => {
                if (totalPages <= 7) return true;
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - safeCurrentPage) <= 1
                );
              })
              .map((page, index, pages) => {
                const prevPage = pages[index - 1];
                const showGap = prevPage !== undefined && page - prevPage > 1;

                return (
                  <div key={page} className="flex items-center gap-1.5">
                    {showGap && <span className="px-1 text-muted-foreground">...</span>}
                    <button
                      type="button"
                      className={`px-2.5 py-1.5 border rounded-md ${
                        page === safeCurrentPage
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border hover:bg-muted'
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}

            <button
              type="button"
              className="px-2.5 py-1.5 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ResponsibilityCenterDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        editingData={editingData}
        existingSections={editingData ? sectionsByCenter.get(editingData.id) || [] : []}
        error={error}
      />
    </div>
  );
};
