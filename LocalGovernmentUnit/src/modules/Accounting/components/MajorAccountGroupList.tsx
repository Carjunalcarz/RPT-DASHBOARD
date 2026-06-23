import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useModulePermissions } from '@/hooks/useRBAC';
import {
  createMajorAccountGroup,
  deleteMajorAccountGroup,
  getAllMajorAccountGroups,
  getAccountGroups,
  getMajorAccountGroups,
  updateMajorAccountGroup,
} from '@/services/accountingService';
import type { AccountGroupHierarchy, MajorAccountGroupHierarchy } from '@/types/accounting.types';
import { MajorAccountGroupDialog } from './MajorAccountGroupDialog';
import { useAccountingHierarchyStore } from '@/store';

export const MajorAccountGroupList = () => {
  const [accountGroups, setAccountGroups] = useState<AccountGroupHierarchy[]>([]);
  const [selectedAccountGroupId, setSelectedAccountGroupId] = useState('');
  const [majorGroups, setMajorGroups] = useState<MajorAccountGroupHierarchy[]>([]);
  const [allMajorGroups, setAllMajorGroups] = useState<MajorAccountGroupHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<MajorAccountGroupHierarchy | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const permissions = useModulePermissions('/accounting/account-groups');
  const hierarchyVersion = useAccountingHierarchyStore((state) => state.hierarchyVersion);
  const bumpHierarchyVersion = useAccountingHierarchyStore((state) => state.bumpHierarchyVersion);
  const canCreate = permissions.canInsert;
  const canRead = permissions.canSelect;
  const canUpdate = permissions.canUpdate;
  const canDelete = permissions.canDelete;

  const toErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object') {
      const maybeError = err as { message?: string; details?: string; hint?: string; code?: string };
      return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
        .filter(Boolean)
        .join(' | ') || fallback;
    }
    return fallback;
  };

  const loadAccountGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccountGroups();
      setAccountGroups(data);
      setError('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load account groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMajorGroups = useCallback(async (accountGroupId?: string) => {
    try {
      setLoading(true);
      const data = accountGroupId ? await getMajorAccountGroups(accountGroupId) : await getAllMajorAccountGroups();
      setMajorGroups(data);
      setError('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load major account groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllMajorGroupsForDialog = useCallback(async () => {
    try {
      const data = await getAllMajorAccountGroups();
      setAllMajorGroups(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load major account groups for dialog'));
    }
  }, []);

  useEffect(() => {
    loadAccountGroups();
  }, [loadAccountGroups, hierarchyVersion]);

  useEffect(() => {
    loadMajorGroups(selectedAccountGroupId || undefined);
  }, [selectedAccountGroupId, loadMajorGroups, hierarchyVersion]);

  useEffect(() => {
    loadAllMajorGroupsForDialog();
  }, [loadAllMajorGroupsForDialog, hierarchyVersion]);

  const handleSubmit = async (formData: {
    code: string;
    description: string;
    account_group: string;
    status: boolean;
    editable: boolean;
  }) => {
    try {
      if (editingData) {
        await updateMajorAccountGroup(editingData.id, formData);
      } else {
        await createMajorAccountGroup(formData);
      }
      setDialogOpen(false);
      setEditingData(null);
      await loadMajorGroups(selectedAccountGroupId || undefined);
      bumpHierarchyVersion();
    } catch (err) {
      setError(toErrorMessage(err, 'Operation failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this major account group?')) {
      try {
        await deleteMajorAccountGroup(id);
        await loadMajorGroups(selectedAccountGroupId || undefined);
        bumpHierarchyVersion();
      } catch (err) {
        setError(toErrorMessage(err, 'Delete failed'));
      }
    }
  };

  const selectedAccountGroup = useMemo(
    () => accountGroups.find((group) => group.id === selectedAccountGroupId) ?? null,
    [accountGroups, selectedAccountGroupId]
  );

  const accountGroupMap = useMemo(
    () => new Map(accountGroups.map((group) => [group.id, group])),
    [accountGroups]
  );

  const filteredMajorGroups = majorGroups.filter((group) => {
    const matchesAccount = !selectedAccountGroupId || group.account_group === selectedAccountGroupId;
    const matchesSearch =
      group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAccount && matchesSearch;
  });

  const getDisplayMajorCode = (group: MajorAccountGroupHierarchy) => {
    const parentGroup = accountGroupMap.get(group.account_group);
    if (!parentGroup) return group.code;
    return `${parentGroup.code}-${group.code}`;
  };

  if (loading) return <div className="p-4 text-center">Loading major account groups...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view major account groups</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2">
          <select
            id="major-group-account-group-filter"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            value={selectedAccountGroupId}
            onChange={(e) => setSelectedAccountGroupId(e.target.value)}
          >
            <option value="">All Account Groups</option>
            {accountGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.description}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
          />

          <button
            type="button"
            onClick={() => {
              setSelectedAccountGroupId('');
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
              Add Major Group
            </button>
          )}
        </div>
      </div>

      {selectedAccountGroup ? (
        <div className="text-xs text-muted-foreground">
          Showing major groups for: <span className="font-medium">{selectedAccountGroup.description}</span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Showing all major account groups
        </div>
      )}

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Account Group</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Major Account Group</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMajorGroups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                  No major account groups found
                </td>
              </tr>
            ) : (
              filteredMajorGroups.map((group) => (
                <tr key={group.id} className="border-b border-border hover:bg-muted/50">
                  {(() => {
                    const parentGroup = accountGroupMap.get(group.account_group);
                    return (
                      <>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">{getDisplayMajorCode(group)}</td>
                  <td className="px-4 py-3 font-medium">{parentGroup ? parentGroup.description : '-'}</td>
                  <td className="px-4 py-3 font-medium">{group.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        group.status ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {group.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {canUpdate && group.editable && (
                      <button
                        onClick={() => {
                          setEditingData(group);
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
                        onClick={() => handleDelete(group.id)}
                        className="p-1 hover:bg-danger/20 rounded text-danger"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MajorAccountGroupDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        accountGroups={accountGroups}
        existingMajorGroups={allMajorGroups}
        defaultAccountGroupId={selectedAccountGroupId}
        editingData={editingData}
        error={error}
      />
    </div>
  );
};
