import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { User, getUsers, updateUser } from '@/services/userService';
import { useThemeColor } from '@/context/ThemeColorContext';
import { Edit2, Save, X, RefreshCw, Shield, UserPlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import sidebarService, { SidebarItem } from '@/services/sidebarService';
import permissionsService from '@/services/permissionsService';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { headerColor } = useThemeColor();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<{ role: string; municipalityCode: string; fullName: string; contactNo: string }>({
    role: 'user',
    municipalityCode: '',
    fullName: '',
    contactNo: ''
  });
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [selectedSidebarItemIds, setSelectedSidebarItemIds] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = (user?.role || '').toLowerCase();
    if (!['admin', 'administrator'].includes(role)) {
        toast.error('Access Denied. Admins only.');
        return;
    }
    fetchUsers();
  }, [user]);

  const isAdmin = ['admin', 'administrator'].includes(String(user?.role || '').toLowerCase());
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      role: u.role,
      municipalityCode: u.municipalityCode || '',
      fullName: u.fullName || '',
      contactNo: u.contactNo || ''
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      console.log('Saving user:', editingUser.id, formData);
      const updatedUser = await updateUser(editingUser.id, formData);
      console.log('User saved:', updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setEditingUser(null);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    }
  };

  const computeTrail = (item: SidebarItem, byId: Record<string, SidebarItem>) => {
    const parts: string[] = [];
    let current: SidebarItem | undefined = item;
    let guard = 0;
    while (current && current.parentId && byId[current.parentId] && guard < 20) {
      current = byId[current.parentId];
      parts.unshift(current.label);
      guard += 1;
    }
    return parts.length ? `${parts.join(' / ')} / ${item.label}` : item.label;
  };

  const openPermissions = async (target: User) => {
    setPermUser(target);
    setPermDialogOpen(true);
    setPermSearch('');
    setPermLoading(true);
    try {
      if (sidebarItems.length === 0) {
        const manage = await sidebarService.getManagementSidebarItems();
        setSidebarItems(manage.data || []);
      }
      const vis = await permissionsService.getUserSidebarVisibility(target.id);
      setSelectedSidebarItemIds(vis.data.sidebarItemIds || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load user permissions');
      setSelectedSidebarItemIds([]);
    } finally {
      setPermLoading(false);
    }
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setPermLoading(true);
    try {
      const byId: Record<string, SidebarItem> = {};
      sidebarItems.forEach((i) => {
        byId[i.id] = i;
      });

      const restrictedIds = sidebarItems
        .filter((i) => i.path && i.path !== '#' && Array.isArray(i.visibleToUserIds) && i.visibleToUserIds.length > 0)
        .map((i) => i.id);

      const selectedRestricted = selectedSidebarItemIds.filter((id) => restrictedIds.includes(id));
      await permissionsService.setUserSidebarVisibility(permUser.id, selectedRestricted);
      toast.success('Permissions updated');
      setPermDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update permissions');
    } finally {
      setPermLoading(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedSidebarItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(search) ||
      (u.fullName || '').toLowerCase().includes(search) ||
      (u.municipalityCode || '').toLowerCase().includes(search) ||
      u.role.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div
        className="px-6 py-4 rounded-lg shadow-sm"
        style={{
          background: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)`,
        }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">User List (Supabase Auth)</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/users/add')}
              className="flex items-center px-3 py-2 bg-white text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus size={18} className="mr-2" />
              Add User
            </button>
            <button
              onClick={fetchUsers}
              className="p-2 text-white bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="Refresh Users"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-1">View all registered users from Supabase Backend</p>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="Search by name, email, role or municipality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
          >
            Clear
          </button>
        )}
        <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Municipality</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Sign In</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                  {searchTerm ? `No users matching "${searchTerm}"` : 'No users found.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser?.id === u.id ? (
                       <div className="space-y-2">
                         <input
                           type="text"
                           value={formData.fullName}
                           onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                           className="block w-full rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-sm px-2 py-1"
                           placeholder="Full Name"
                         />
                         <input
                           type="text"
                           value={formData.contactNo}
                           onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                           className="block w-full rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-sm px-2 py-1"
                           placeholder="Contact No."
                         />
                         <div className="text-xs text-slate-500">{u.email}</div>
                       </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.fullName || 'No Name'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        {u.contactNo && <div className="text-xs text-slate-400">{u.contactNo}</div>}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {editingUser?.id === u.id ? (
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="block w-full rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {editingUser?.id === u.id ? (
                      <input
                        type="text"
                        value={formData.municipalityCode}
                        onChange={(e) => setFormData({ ...formData, municipalityCode: e.target.value })}
                        className="block w-full rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Code"
                      />
                    ) : (
                      u.municipalityCode ? (
                         <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-mono">
                           {u.municipalityCode}
                         </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">None</span>
                      )
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : 'Never'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingUser?.id === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-full hover:bg-green-100 transition-colors"
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPermissions(u)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                          title="Permissions"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Permissions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <div className="font-semibold">{permUser?.fullName || permUser?.email || 'User'}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{permUser?.id || ''}</div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Only restricted pages can be toggled here. Pages marked “Everyone” remain visible to all users.
            </div>

            <input
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder="Search pages by label or path..."
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />

            <div className="max-h-[420px] overflow-auto border border-slate-200 dark:border-slate-700 rounded-md">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {permLoading ? (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading...</div>
                ) : (() => {
                  const byId: Record<string, SidebarItem> = {};
                  sidebarItems.forEach((i) => {
                    byId[i.id] = i;
                  });

                  const role = String(permUser?.role || '').toLowerCase();
                  const isTargetAdmin = ['admin', 'administrator'].includes(role);

                  const rows = sidebarItems
                    .filter((i) => i.path && i.path !== '#')
                    .map((i) => ({
                      ...i,
                      trail: computeTrail(i, byId),
                      isRestricted: Array.isArray(i.visibleToUserIds) && i.visibleToUserIds.length > 0,
                      disabled: !!i.adminOnly && !isTargetAdmin,
                    }))
                    .filter((i) => {
                      const q = permSearch.trim().toLowerCase();
                      if (!q) return true;
                      return String(i.trail).toLowerCase().includes(q) || String(i.path).toLowerCase().includes(q);
                    })
                    .sort((a, b) => String(a.trail).localeCompare(String(b.trail)));

                  if (rows.length === 0) {
                    return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No matching pages.</div>;
                  }

                  return rows.map((i) => {
                    const checked = selectedSidebarItemIds.includes(i.id);
                    const canToggle = i.isRestricted && !i.disabled;
                    return (
                      <div key={i.id} className="p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{i.trail}</div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{i.path}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              i.isRestricted
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                            }`}>
                              {i.isRestricted ? 'Restricted' : 'Everyone'}
                            </span>
                            {i.adminOnly ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200">
                                Admin only
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canToggle}
                            onChange={() => toggleSelected(i.id)}
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setPermDialogOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              disabled={permLoading}
            >
              Cancel
            </button>
            <button
              onClick={savePermissions}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={permLoading}
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
