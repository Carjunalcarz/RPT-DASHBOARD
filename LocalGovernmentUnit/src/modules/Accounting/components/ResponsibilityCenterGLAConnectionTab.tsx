import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BaseDialog } from '@/components/ui/dialog';
import { useModulePermissions } from '@/hooks/useRBAC';
import {
  createResponsibilityCenterGLAConnection,
  deleteResponsibilityCenterGLAConnection,
  type AccountGroup,
  type GeneralLedgerAccount,
  type MajorAccountGroup,
  type SubMajorAccountGroup,
  getAccountGroups,
  getAllMajorAccountGroups,
  getAllSubMajorAccountGroups,
  getAllGeneralLedgerAccounts,
  getResponsibilityCenterGLAConnections,
  getResponsibilityCenters,
} from '@/services/accountingService';
import type {
  ResponsibilityCenter,
  ResponsibilityCenterGLAConnection,
} from '@/services/accountingService';

const getResponsibilityCenterLabel = (rc: ResponsibilityCenter): string => {
  if (rc.code && rc.description) return `${rc.code} - ${rc.description}`;
  if (rc.description) return rc.description;
  if (rc.name) return rc.name;
  if (rc.code) return rc.code;
  return rc.id;
};

export const ResponsibilityCenterGLAConnectionTab = () => {
  const [responsibilityCenters, setResponsibilityCenters] = useState<ResponsibilityCenter[]>([]);
  const [glas, setGlas] = useState<GeneralLedgerAccount[]>([]);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [majorGroups, setMajorGroups] = useState<MajorAccountGroup[]>([]);
  const [subMajorGroups, setSubMajorGroups] = useState<SubMajorAccountGroup[]>([]);
  const [connections, setConnections] = useState<ResponsibilityCenterGLAConnection[]>([]);

  // View filters
  const [selectedRcId, setSelectedRcId] = useState('');
  const [selectedGlaId, setSelectedGlaId] = useState('');

  // Add relation form
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formRcId, setFormRcId] = useState('');
  const [formGlaId, setFormGlaId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const permissions = useModulePermissions('/accounting/account-groups');
  const canCreate = permissions.canInsert;
  const canRead = permissions.canSelect;
  const canDelete = permissions.canDelete;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rcData, glaData, accountData, majorData, subMajorData, connectionData] = await Promise.all([
        getResponsibilityCenters(),
        getAllGeneralLedgerAccounts(),
        getAccountGroups(),
        getAllMajorAccountGroups(),
        getAllSubMajorAccountGroups(),
        getResponsibilityCenterGLAConnections(),
      ]);

      setResponsibilityCenters(rcData);
      setGlas(glaData);
      setAccountGroups(accountData);
      setMajorGroups(majorData);
      setSubMajorGroups(subMajorData);
      setConnections(connectionData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RC-GLA connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!formRcId || !formGlaId) {
      setError('Please select both a Responsibility Center and a GLA.');
      return;
    }

    try {
      await createResponsibilityCenterGLAConnection({
        rc_id: formRcId,
        gla_id: formGlaId,
      });
      setFormGlaId('');
      setIsAddDialogOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this RC to GLA connection?')) return;

    try {
      await deleteResponsibilityCenterGLAConnection(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection');
    }
  };

  const rcMap = useMemo(
    () => new Map(responsibilityCenters.map((rc) => [rc.id, rc])),
    [responsibilityCenters]
  );

  const glaMap = useMemo(
    () => new Map(glas.map((gla) => [gla.id, gla])),
    [glas]
  );

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

  const getFullGLCode = (gla: GeneralLedgerAccount) => {
    const subMajor = subMajorGroupMap.get(gla.sub_major_account_group);
    const major = subMajor ? majorGroupMap.get(subMajor.major_account_group) : null;
    const account = major ? accountGroupMap.get(major.account_group) : null;

    if (account && major && subMajor) {
      return `${account.code}-${major.code}-${subMajor.code}-${gla.code}`;
    }

    return gla.code;
  };

  const getGLALabel = (gla: GeneralLedgerAccount): string => `${getFullGLCode(gla)} - ${gla.description}`;

  const filteredConnections = connections.filter((connection) => {
    const matchRc = !selectedRcId || connection.rc_id === selectedRcId;
    const matchGla = !selectedGlaId || connection.gla_id === selectedGlaId;
    return matchRc && matchGla;
  });

  if (loading) return <div className="p-4 text-center">Loading responsibility center connections...</div>;
  if (!canRead) return <div className="p-4 text-center text-muted-foreground">No permission to view RC-GLA connections</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
        <select
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
          value={selectedRcId}
          onChange={(e) => setSelectedRcId(e.target.value)}
        >
          <option value="">Filter by Responsibility Center</option>
          {responsibilityCenters.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {getResponsibilityCenterLabel(rc)}
            </option>
          ))}
        </select>

        <select
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
          value={selectedGlaId}
          onChange={(e) => setSelectedGlaId(e.target.value)}
        >
          <option value="">Filter by General Ledger Account</option>
          {glas.map((gla) => (
            <option key={gla.id} value={gla.id}>
              {getGLALabel(gla)}
            </option>
          ))}
        </select>

        {canCreate && (
          <button
            onClick={() => {
              setError('');
              setFormRcId(selectedRcId || '');
              setFormGlaId('');
              setIsAddDialogOpen(true);
            }}
            className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Relation
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Responsibility Center</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">General Ledger Account</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Created At</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredConnections.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">
                  No RC-GLA connections found
                </td>
              </tr>
            ) : (
              filteredConnections.map((connection) => {
                const rc = rcMap.get(connection.rc_id);
                const gla = glaMap.get(connection.gla_id);

                return (
                  <tr key={connection.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3">{rc ? getResponsibilityCenterLabel(rc) : connection.rc_id}</td>
                    <td className="px-4 py-3">{gla ? getGLALabel(gla) : connection.gla_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(connection.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(connection.id)}
                          className="p-1 hover:bg-danger/20 rounded text-danger"
                          title="Delete connection"
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

      <BaseDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add RC-GLA Relation"
        onSubmit={handleConnect}
        submitLabel="Connect"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Responsibility Center <span className="text-error ml-1">*</span>
            </label>
            <select
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
              value={formRcId}
              onChange={(e) => setFormRcId(e.target.value)}
            >
              <option value="">Select Responsibility Center</option>
              {responsibilityCenters.map((rc) => (
                <option key={rc.id} value={rc.id}>
                  {getResponsibilityCenterLabel(rc)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              General Ledger Account <span className="text-error ml-1">*</span>
            </label>
            <select
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
              value={formGlaId}
              onChange={(e) => setFormGlaId(e.target.value)}
            >
              <option value="">Select General Ledger Account</option>
              {glas.map((gla) => (
                <option key={gla.id} value={gla.id}>
                  {getGLALabel(gla)}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </BaseDialog>
    </div>
  );
};
