import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import permissionsService, { PermissionNode } from '@/services/permissionsService';
import { RefreshCw, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

const flattenPermissions = (nodes: PermissionNode[], parentTrail: string[] = []) => {
  const rows: Array<{
    id: string;
    label: string;
    path: string;
    trail: string;
    accessLevel: string;
    accessReason: string;
  }> = [];

  nodes.forEach((n) => {
    const trail = [...parentTrail, n.label].join(' / ');
    if (n.path && n.path !== '#') {
      rows.push({
        id: n.id,
        label: n.label,
        path: n.path,
        trail,
        accessLevel: n.access?.accessLevel || 'view',
        accessReason: n.access?.reason || 'none',
      });
    }
    const children = Array.isArray(n.children) ? n.children : [];
    rows.push(...flattenPermissions(children, [...parentTrail, n.label]));
  });

  return rows;
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { refreshMenu } = useSidebar();
  const { headerColor } = useThemeColor();

  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<PermissionNode[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      await refreshMenu();
      const res = await permissionsService.getMyPermissions();
      if (res?.success) {
        setModules(res.data.modules || []);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load profile permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => flattenPermissions(modules), [modules]);

  return (
    <div className="space-y-6 p-6">
      <div className="px-6 py-4 rounded-lg shadow-sm" style={{ background: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)` }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">My Profile</h1>
            <p className="text-blue-100 text-sm mt-1">Account details and authorized access</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-white bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <UserIcon className="text-white" size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.fullName || user?.name || 'User'}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email || '-'}</div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Role</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{user?.role || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Municipality</span>
              <span className="font-mono text-xs text-slate-900 dark:text-slate-100">{(user as any)?.municipalityCode || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">User ID</span>
              <span className="font-mono text-xs text-slate-900 dark:text-slate-100">{user?.id || '-'}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-slate-600 dark:text-slate-300" />
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Authorized Pages</div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{rows.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      No authorized pages returned.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{r.trail}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{r.path}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {r.accessLevel} · {r.accessReason}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

