import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useModulePermissions } from '@/hooks/useRBAC';
import {
  createGeneralLedgerAccount,
  deleteGeneralLedgerAccount,
  getAllGeneralLedgerAccounts,
  getAllMajorAccountGroups,
  getAllSubMajorAccountGroups,
  getAccountGroups,
  getGeneralLedgerAccounts,
  getMajorAccountGroups,
  getSubMajorAccountGroups,
  updateGeneralLedgerAccount,
} from '@/services/accountingService';
import type {
  AccountGroupHierarchy,
  GeneralLedgerAccountHierarchy,
  MajorAccountGroupHierarchy,
  SubMajorAccountGroupHierarchy,
} from '@/types/accounting.types';
import { GeneralLedgerAccountDialog } from './GeneralLedgerAccountDialog';
import { useAccountingHierarchyStore } from '@/store';

export const GeneralLedgerAccountList = () => {
  const [accountGroups, setAccountGroups] = useState<AccountGroupHierarchy[]>([]);
  const [majorGroups, setMajorGroups] = useState<MajorAccountGroupHierarchy[]>([]);
  const [dialogMajorGroups, setDialogMajorGroups] = useState<MajorAccountGroupHierarchy[]>([]);
  const [subMajorGroups, setSubMajorGroups] = useState<SubMajorAccountGroupHierarchy[]>([]);
  const [dialogSubMajorGroups, setDialogSubMajorGroups] = useState<SubMajorAccountGroupHierarchy[]>([]);
  const [glAccounts, setGlAccounts] = useState<GeneralLedgerAccountHierarchy[]>([]);
  const [allGLAccounts, setAllGLAccounts] = useState<GeneralLedgerAccountHierarchy[]>([]);

  const [selectedAccountGroupId, setSelectedAccountGroupId] = useState('');
  const [selectedMajorGroupId, setSelectedMajorGroupId] = useState('');
  const [selectedSubMajorGroupId, setSelectedSubMajorGroupId] = useState('');

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<GeneralLedgerAccountHierarchy | null>(null);
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
      setSelectedSubMajorGroupId((prev) => {
        return data.some((item) => item.id === prev) ? prev : '';
      });
      setError('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load sub major account groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGLAccounts = useCallback(async (subMajorGroupId?: string) => {
    try {
      setLoading(true);
      const data = subMajorGroupId ? await getGeneralLedgerAccounts(subMajorGroupId) : await getAllGeneralLedgerAccounts();
      setGlAccounts(data);
      setError('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load general ledger accounts'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllGLAccountsForDialog = useCallback(async () => {
    try {
      const data = await getAllGeneralLedgerAccounts();
      setAllGLAccounts(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load general ledger accounts for dialog'));
      setAllGLAccounts([]);
    }
  }, []);

  const loadDialogSubMajorGroups = useCallback(async () => {
    try {
      const majors = await getAllMajorAccountGroups();
      setDialogMajorGroups(majors);

      if (majors.length === 0) {
        setDialogSubMajorGroups([]);
        return;
      }

      const subMajorLists = await Promise.all(
        majors.map((major) => getSubMajorAccountGroups(major.id))
      );

      const unique = new Map<string, SubMajorAccountGroupHierarchy>();
      subMajorLists.flat().forEach((item) => {
        unique.set(item.id, item);
      });

      setDialogSubMajorGroups(Array.from(unique.values()));
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load selectable sub major account groups'));
      setDialogMajorGroups([]);
      setDialogSubMajorGroups([]);
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
    loadGLAccounts(selectedSubMajorGroupId || undefined);
  }, [selectedSubMajorGroupId, loadGLAccounts, hierarchyVersion]);

  useEffect(() => {
    loadAllGLAccountsForDialog();
  }, [loadAllGLAccountsForDialog, hierarchyVersion]);

  const handleSubmit = async (formData: {
    code: string;
    description: string;
    sub_major_account_group: string;
    account_type: 'Budgetary Accounts' | 'Financial Transactions';
    status: boolean;
    editable: boolean;
  }) => {
    try {
      if (editingData) {
        await updateGeneralLedgerAccount(editingData.id, formData);
      } else {
        await createGeneralLedgerAccount(formData);
      }

      setDialogOpen(false);
      setEditingData(null);
      await loadGLAccounts(selectedSubMajorGroupId || undefined);
      bumpHierarchyVersion();
    } catch (err) {
      setError(toErrorMessage(err, 'Operation failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this general ledger account?')) return;

    try {
      await deleteGeneralLedgerAccount(id);
      if (selectedSubMajorGroupId) await loadGLAccounts(selectedSubMajorGroupId);
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

  const subMajorGroupMap = useMemo(
    () => new Map(subMajorGroups.map((item) => [item.id, item])),
    [subMajorGroups]
  );

  const selectedAccountGroup = selectedAccountGroupId ? accountGroupMap.get(selectedAccountGroupId) ?? null : null;
  const selectedMajorGroup = selectedMajorGroupId ? majorGroupMap.get(selectedMajorGroupId) ?? null : null;
  const selectedSubMajorGroup = selectedSubMajorGroupId ? subMajorGroupMap.get(selectedSubMajorGroupId) ?? null : null;

  const filteredGLAccounts = glAccounts.filter(
    (gla) => {
      const subMajor = subMajorGroupMap.get(gla.sub_major_account_group);
      const major = subMajor ? majorGroupMap.get(subMajor.major_account_group) : null;
      const matchesAccount = !selectedAccountGroupId || major?.account_group === selectedAccountGroupId;
      const matchesMajor = !selectedMajorGroupId || subMajor?.major_account_group === selectedMajorGroupId;
      const matchesSubMajor = !selectedSubMajorGroupId || gla.sub_major_account_group === selectedSubMajorGroupId;
      const matchesSearch =
        gla.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gla.description.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesAccount && matchesMajor && matchesSubMajor && matchesSearch;
    }
  );

  const getDisplayGLCode = (gla: GeneralLedgerAccountHierarchy) => {
    const subMajor = subMajorGroupMap.get(gla.sub_major_account_group);
    const major = subMajor ? majorGroupMap.get(subMajor.major_account_group) : null;
    const account = major ? accountGroupMap.get(major.account_group) : null;

    if (account && major && subMajor) {
      return `${account.code}-${major.code}-${subMajor.code}-${gla.code}`;
    }

    if (subMajor && major) return `${major.code}-${subMajor.code}-${gla.code}`;
    if (subMajor) return `${subMajor.code}-${gla.code}`;
    return gla.code;
  };

  if (loading) return <div className="p-4 text-center">Loading general ledger accounts...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view general ledger accounts</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
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

          <select
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            value={selectedSubMajorGroupId}
            onChange={(e) => setSelectedSubMajorGroupId(e.target.value)}
            disabled={subMajorGroups.length === 0}
          >
            <option value="">All Sub Major Account Groups</option>
            {subMajorGroups.map((group) => (
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
              setSelectedSubMajorGroupId('');
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
                void loadDialogSubMajorGroups();
                setEditingData(null);
                setDialogOpen(true);
              }}
              className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add GL Account
            </button>
          )}
        </div>
      </div>

      {selectedAccountGroup || selectedMajorGroup || selectedSubMajorGroup ? (
        <div className="text-xs text-muted-foreground">
          Showing GL accounts for:
          {' '}
          <span className="font-medium">
            {[selectedAccountGroup?.description, selectedMajorGroup?.description, selectedSubMajorGroup?.description].filter(Boolean).join(' / ')}
          </span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Showing all general ledger accounts</div>
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
              <th className="px-4 py-3 text-left font-medium text-foreground">General Ledger Account</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Account Type</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGLAccounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">
                  No general ledger accounts found
                </td>
              </tr>
            ) : (
              filteredGLAccounts.map((gla) => (
                <tr key={gla.id} className="border-b border-border hover:bg-muted/50">
                  {(() => {
                    const subMajor = subMajorGroupMap.get(gla.sub_major_account_group);
                    const major = subMajor ? majorGroupMap.get(subMajor.major_account_group) : null;
                    const account = major ? accountGroupMap.get(major.account_group) : null;

                    return (
                      <>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">{getDisplayGLCode(gla)}</td>
                  <td className="px-4 py-3 font-medium">{account ? account.description : '-'}</td>
                  <td className="px-4 py-3 font-medium">{major ? major.description : '-'}</td>
                  <td className="px-4 py-3 font-medium">{subMajor ? subMajor.description : '-'}</td>
                  <td className="px-4 py-3 font-medium">{gla.description}</td>
                  <td className="px-4 py-3 text-xs sm:text-sm">{gla.account_type ?? 'Not set'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        gla.status ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {gla.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {canUpdate && gla.editable && (
                      <button
                        onClick={() => {
                          void loadDialogSubMajorGroups();
                          setEditingData(gla);
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
                        onClick={() => handleDelete(gla.id)}
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

      <GeneralLedgerAccountDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        accountGroups={accountGroups}
        majorGroups={dialogMajorGroups.length > 0 ? dialogMajorGroups : majorGroups}
        subMajorGroups={dialogSubMajorGroups.length > 0 ? dialogSubMajorGroups : subMajorGroups}
        existingGLAccounts={allGLAccounts}
        defaultAccountGroupId={selectedAccountGroupId}
        defaultMajorGroupId={selectedMajorGroupId}
        defaultSubMajorGroupId={selectedSubMajorGroupId}
        editingData={editingData}
        error={error}
      />
    </div>
  );
};
