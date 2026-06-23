import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { AccountGroupDialog } from './AccountGroupDialog';
import { getAccountGroups, deleteAccountGroup, createAccountGroup, updateAccountGroup } from '@/services/accountingService';
import type { AccountGroupHierarchy } from '@/types/accounting.types';
import { useModulePermissions } from '@/hooks/useRBAC';
import { useAccountingHierarchyStore } from '@/store';

interface AccountGroupListProps {
  onSelectGroup?: (group: AccountGroupHierarchy) => void;
}

export const AccountGroupList = ({ onSelectGroup }: AccountGroupListProps) => {
  const [groups, setGroups] = useState<AccountGroupHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<AccountGroupHierarchy | null>(null);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const permissions = useModulePermissions('/accounting/account-groups');
  const hierarchyVersion = useAccountingHierarchyStore((state) => state.hierarchyVersion);
  const bumpHierarchyVersion = useAccountingHierarchyStore((state) => state.bumpHierarchyVersion);
  const canCreate = permissions.canInsert;
  const canRead = permissions.canSelect;
  const canUpdate = permissions.canUpdate;
  const canDelete = permissions.canDelete;

  useEffect(() => {
    loadGroups();
  }, [hierarchyVersion]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await getAccountGroups();
      setGroups(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: { code: string; description: string; status: boolean; editable: boolean }) => {
    try {
      if (editingData) {
        await updateAccountGroup(editingData.id, formData);
      } else {
        await createAccountGroup(formData);
      }
      setDialogOpen(false);
      setEditingData(null);
      await loadGroups();
      bumpHierarchyVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account group?')) {
      try {
        await deleteAccountGroup(id);
        await loadGroups();
        bumpHierarchyVersion();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-4 text-center">Loading account groups...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view account groups</div>;

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
            onClick={() => {
              setEditingData(null);
              setDialogOpen(true);
            }}
            className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Group
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
              <th className="px-4 py-3 text-left font-medium text-foreground">Account Group</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">
                  No account groups found
                </td>
              </tr>
            ) : (
              filteredGroups.map((group) => (
                <tr key={group.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">{group.code}</td>
                  <td className="px-4 py-3 font-medium">{group.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        group.status
                          ? 'bg-success/20 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {group.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {onSelectGroup && (
                      <button
                        onClick={() => onSelectGroup(group)}
                        className="p-1 hover:bg-muted rounded text-foreground"
                        title="Open"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <AccountGroupDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingData(null);
          }}
          onSubmit={handleSubmit}
          editingData={editingData}
          existingCodes={groups.map((group) => group.code)}
          error={error}
        />
      )}
    </div>
  );
};
