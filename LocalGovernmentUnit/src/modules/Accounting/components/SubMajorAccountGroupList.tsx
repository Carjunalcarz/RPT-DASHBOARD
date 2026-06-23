import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useModulePermissions } from '@/hooks/useRBAC';
import {
  createSubMajorAccountGroup,
  deleteSubMajorAccountGroup,
  getAllMajorAccountGroups,
  getAllSubMajorAccountGroups,
  getAccountGroups,
  getMajorAccountGroups,
  getSubMajorAccountGroups,
  updateSubMajorAccountGroup,
} from '@/services/accountingService';
import type {
  AccountGroupHierarchy,
  MajorAccountGroupHierarchy,
  SubMajorAccountGroupHierarchy,
} from '@/types/accounting.types';
import { SubMajorAccountGroupDialog } from './SubMajorAccountGroupDialog';
import { useAccountingHierarchyStore } from '@/store';

export const SubMajorAccountGroupList = () => {
  const [accountGroups, setAccountGroups] = useState<AccountGroupHierarchy[]>([]);
  const [majorGroups, setMajorGroups] = useState<MajorAccountGroupHierarchy[]>([]);
  const [dialogMajorGroups, setDialogMajorGroups] = useState<MajorAccountGroupHierarchy[]>([]);
  const [subMajorGroups, setSubMajorGroups] = useState<SubMajorAccountGroupHierarchy[]>([]);
  const [allSubMajorGroups, setAllSubMajorGroups] = useState<SubMajorAccountGroupHierarchy[]>([]);

  const [selectedAccountGroupId, setSelectedAccountGroupId] = useState('');
  const [selectedMajorGroupId, setSelectedMajorGroupId] = useState('');

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<SubMajorAccountGroupHierarchy | null>(null);
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
      setSelectedMajorGroupId((prev) => {
        return data.some((item) => item.id === prev) ? prev : '';
      });
      setError('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load major account groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubMajorGroups = useCallback(async (majorGroupId?: string) => {
    try {
      setLoading(true);
      const data = majorGroupId ? await getSubMajorAccountGroups(majorGroupId) : await getAllSubMajorAccountGroups();
      setSubMajorGroups(data);
      setError('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load sub major account groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllSubMajorGroupsForDialog = useCallback(async () => {
    try {
      const data = await getAllSubMajorAccountGroups();
      setAllSubMajorGroups(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load sub major account groups for dialog'));
      setAllSubMajorGroups([]);
    }
  }, []);

  const loadDialogMajorGroups = useCallback(async () => {
    try {
      const data = await getAllMajorAccountGroups();
      setDialogMajorGroups(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load selectable major account groups'));
      setDialogMajorGroups([]);
    }
  }, []);

  useEffect(() => {
    loadAccountGroups();
  }, [loadAccountGroups, hierarchyVersion]);

  useEffect(() => {
    loadMajorGroups(selectedAccountGroupId || undefined);
  }, [selectedAccountGroupId, loadMajorGroups, hierarchyVersion]);

  useEffect(() => {
    loadSubMajorGroups(selectedMajorGroupId || undefined);
  }, [selectedMajorGroupId, loadSubMajorGroups, hierarchyVersion]);

  useEffect(() => {
    loadAllSubMajorGroupsForDialog();
  }, [loadAllSubMajorGroupsForDialog, hierarchyVersion]);

  const handleSubmit = async (formData: {
    code: string;
    description: string;
    major_account_group: string;
    status: boolean;
    editable: boolean;
  }) => {
    try {
      if (editingData) {
        await updateSubMajorAccountGroup(editingData.id, formData);
      } else {
        await createSubMajorAccountGroup(formData);
      }

      setDialogOpen(false);
      setEditingData(null);
      await loadSubMajorGroups(selectedMajorGroupId || undefined);
      bumpHierarchyVersion();
    } catch (err) {
      setError(toErrorMessage(err, 'Operation failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sub major account group?')) return;

    try {
      await deleteSubMajorAccountGroup(id);
      await loadSubMajorGroups(selectedMajorGroupId || undefined);
      bumpHierarchyVersion();
    } catch (err) {
      setError(toErrorMessage(err, 'Delete failed'));
    }
  };

  const accountGroupMap = useMemo(
    () => new Map(accountGroups.map((item) => [item.id, item])),
    [accountGroups]
  );

  const majorGroupMap = useMemo(
    () => new Map(majorGroups.map((item) => [item.id, item])),
    [majorGroups]
  );

  const selectedAccountGroup = selectedAccountGroupId ? accountGroupMap.get(selectedAccountGroupId) ?? null : null;
  const selectedMajorGroup = selectedMajorGroupId ? majorGroupMap.get(selectedMajorGroupId) ?? null : null;

  const filteredSubMajorGroups = subMajorGroups.filter((group) => {
    const majorGroup = majorGroupMap.get(group.major_account_group);
    const matchesAccount = !selectedAccountGroupId || majorGroup?.account_group === selectedAccountGroupId;
    const matchesMajor = !selectedMajorGroupId || group.major_account_group === selectedMajorGroupId;
    const matchesSearch =
      group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAccount && matchesMajor && matchesSearch;
  });

  const getDisplaySubMajorCode = (group: SubMajorAccountGroupHierarchy) => {
    const majorGroup = majorGroupMap.get(group.major_account_group);
    const accountGroup = majorGroup ? accountGroupMap.get(majorGroup.account_group) : null;

    if (accountGroup && majorGroup) {
      return `${accountGroup.code}-${majorGroup.code}-${group.code}`;
    }

    if (majorGroup) return `${majorGroup.code}-${group.code}`;
    return group.code;
  };

  if (loading) return <div className="p-4 text-center">Loading sub major account groups...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view sub major account groups</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <select
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

          <select
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            value={selectedMajorGroupId}
            onChange={(e) => setSelectedMajorGroupId(e.target.value)}
            disabled={majorGroups.length === 0}
          >
            <option value="">All Major Account Groups</option>
            {majorGroups.map((group) => (
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
              setSelectedMajorGroupId('');
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
                void loadDialogMajorGroups();
                setEditingData(null);
                setDialogOpen(true);
              }}
              className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Sub Major Group
            </button>
          )}
        </div>
      </div>

      {selectedAccountGroup && selectedMajorGroup ? (
        <div className="text-xs text-muted-foreground">
          Showing sub major groups for:
          {' '}
          <span className="font-medium">
            {selectedAccountGroup.description} / {selectedMajorGroup.description}
          </span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Showing all sub major account groups</div>
      )}

      {error && <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Account Group</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Major Account Group</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Sub Major Account Group</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubMajorGroups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                  No sub major account groups found
                </td>
              </tr>
            ) : (
              filteredSubMajorGroups.map((group) => (
                <tr key={group.id} className="border-b border-border hover:bg-muted/50">
                  {(() => {
                    const majorGroup = majorGroupMap.get(group.major_account_group);
                    const accountGroup = majorGroup ? accountGroupMap.get(majorGroup.account_group) : null;

                    return (
                      <>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">{getDisplaySubMajorCode(group)}</td>
                  <td className="px-4 py-3 font-medium">{accountGroup ? accountGroup.description : '-'}</td>
                  <td className="px-4 py-3 font-medium">{majorGroup ? majorGroup.description : '-'}</td>
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
                          void loadDialogMajorGroups();
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

      <SubMajorAccountGroupDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        accountGroups={accountGroups}
        majorGroups={dialogMajorGroups.length > 0 ? dialogMajorGroups : majorGroups}
        existingSubMajorGroups={allSubMajorGroups}
        defaultAccountGroupId={selectedAccountGroupId}
        defaultMajorGroupId={selectedMajorGroupId}
        editingData={editingData}
        error={error}
      />
    </div>
  );
};
