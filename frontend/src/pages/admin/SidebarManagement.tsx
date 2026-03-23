import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import sidebarService, { SidebarItem } from '@/services/sidebarService';
import { getUsers, type User as AppUser } from '@/services/userService';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ClipboardEdit,
  Database,
  Package,
  CheckSquare,
  FileClock,
  UserCog,
  CheckCircle,
  Settings2,
  Menu
} from 'lucide-react';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ClipboardEdit,
  Database,
  Package,
  CheckSquare,
  FileClock,
  UserCog,
  CheckCircle,
  Settings2,
  Menu
};

const SidebarManagement: React.FC = () => {
  const { user } = useAuth();
  const { headerColor } = useThemeColor();
  const { refreshMenu } = useSidebar();
  const navigate = useNavigate();
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SidebarItem>>({});
  const [visibilityMode, setVisibilityMode] = useState<'everyone' | 'admin' | 'users'>('everyone');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userPickerQuery, setUserPickerQuery] = useState('');
  const [userPickerSelected, setUserPickerSelected] = useState<Set<string>>(new Set());
  const userPickerInputRef = useRef<HTMLInputElement | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && !['admin', 'administrator'].includes(user.role.toLowerCase())) {
      toast.error('Access Denied');
      navigate('/dashboard');
      return;
    }
    fetchItems();
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const u = await getUsers();
      setUsers(u);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!userPickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserPickerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    userPickerInputRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [userPickerOpen]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await sidebarService.getManagementSidebarItems();
      if (response.success) {
        // Sort items by hierarchy for the table
        const flatHierarchy: SidebarItem[] = [];
        const processItems = (parentId: string | null, level: number) => {
          const children = response.data.filter((i: SidebarItem) => i.parentId === parentId);
          children.sort((a: SidebarItem, b: SidebarItem) => a.order - b.order);
          children.forEach((child: SidebarItem) => {
            flatHierarchy.push({ ...child, level } as any);
            processItems(child.id, level + 1);
          });
        };
        processItems(null, 0);
        setItems(flatHierarchy);
      } else {
        toast.error(response.message || 'Failed to fetch sidebar items');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch sidebar items');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: SidebarItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    if (item.adminOnly) setVisibilityMode('admin');
    else if ((item.visibleToUserIds || []).length > 0) setVisibilityMode('users');
    else setVisibilityMode('everyone');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
    setVisibilityMode('everyone');
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!editForm.label || !editForm.path) {
      toast.error('Label and Path are required');
      return;
    }
    if (visibilityMode === 'users' && (!editForm.visibleToUserIds || editForm.visibleToUserIds.length === 0)) {
      toast.error('Select at least one user for Selected Users visibility');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Partial<SidebarItem> = { ...editForm };
      if (visibilityMode === 'admin') {
        payload.adminOnly = true;
        payload.visibleToUserIds = [];
      } else if (visibilityMode === 'everyone') {
        payload.adminOnly = false;
        payload.visibleToUserIds = [];
      } else {
        payload.adminOnly = false;
        payload.visibleToUserIds = editForm.visibleToUserIds || [];
      }
      if (editingId) {
        const response = await sidebarService.updateSidebarItem(editingId, payload);
        if (response.success) {
          toast.success('Sidebar item updated');
          await fetchItems();
          await refreshMenu();
          handleCancel();
        } else {
          toast.error(response.message || 'Failed to update sidebar item');
        }
      } else {
        const response = await sidebarService.createSidebarItem(payload);
        if (response.success) {
          toast.success('Sidebar item created');
          await fetchItems();
          await refreshMenu();
          handleCancel();
        } else {
          toast.error(response.message || 'Failed to create sidebar item');
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save sidebar item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await sidebarService.deleteSidebarItem(id);
        if (response.success) {
          toast.success('Sidebar item deleted');
          await fetchItems();
          await refreshMenu();
        }
      } catch (error) {
        toast.error('Failed to delete sidebar item');
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchItems();
      await refreshMenu();
      toast.success('Sidebar data refreshed');
    } catch (error) {
      toast.error('Failed to refresh sidebar data');
    }
  };

  const handleSeed = async () => {
    if (window.confirm('This will reset the sidebar to default items. Continue?')) {
      try {
        setLoading(true);
        const response = await sidebarService.seedSidebarItems();
        if (response.success) {
          toast.success('Sidebar reset to defaults');
          await fetchItems();
          await refreshMenu();
        }
      } catch (error) {
        toast.error('Failed to seed sidebar');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = iconMap[iconName];
    return Icon ? <Icon size={16} /> : null;
  };

  const renderVisibilityBadge = (item: SidebarItem) => {
    const count = (item.visibleToUserIds || []).length;
    if (item.adminOnly) {
      return (
        <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-700">
          Admin Only
        </span>
      );
    }
    if (count > 0) {
      return (
        <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-700">
          Selected ({count})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">
        Everyone
      </span>
    );
  };

  const getUserDisplay = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return id;
    if (u.fullName) return u.email ? `${u.fullName} (${u.email})` : u.fullName;
    return u.email || id;
  };

  const openUserPicker = () => {
    setUserPickerQuery('');
    setUserPickerSelected(new Set(editForm.visibleToUserIds || []));
    setUserPickerOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    const q = userPickerQuery.trim().toLowerCase();
    if (!q) return true;
    return (u.email || '').toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q);
  });

  const toggleUserInPicker = (userId: string, checked: boolean | 'indeterminate') => {
    setUserPickerSelected((prev) => {
      const next = new Set(prev);
      if (checked === true) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setUserPickerSelected((prev) => {
      const next = new Set(prev);
      filteredUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const clearPickerSelection = () => setUserPickerSelected(new Set());

  const confirmUserPicker = () => {
    const ids = Array.from(userPickerSelected);
    setEditForm({ ...editForm, visibleToUserIds: ids });
    setUserPickerOpen(false);
  };

  const renderSelectedUsersSummary = (ids: string[]) => {
    if (!ids.length) return <span className="text-xs text-slate-400">No users selected</span>;
    const labels = ids.slice(0, 2).map(getUserDisplay);
    const extra = ids.length - labels.length;
    return (
      <div className="text-xs text-slate-700 dark:text-slate-200">
        <span className="font-semibold">{ids.length}</span> selected
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={ids.map(getUserDisplay).join(', ')}>
          {labels.join(', ')}
          {extra > 0 ? ` +${extra} more` : ''}
        </div>
      </div>
    );
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
      <div className="space-y-6 p-6">
      <div
        className="px-6 py-4 rounded-lg shadow-sm"
        style={{
          background: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Sidebar Management</h1>
            <p className="text-blue-100 text-sm mt-1">Manage navigation labels, icons, and hierarchy across the app</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium shadow-sm"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Label</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Path</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Icon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Visibility</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {isAdding && (
              <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                <td className="px-6 py-4">
                  <input
                    type="number"
                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                    value={editForm.order || 0}
                    onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) })}
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                    placeholder="Label"
                    value={editForm.label || ''}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  />
                </td>
                <td className="px-6 py-4">
                  <select
                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                    value={editForm.parentId || ''}
                    onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value || null })}
                  >
                    <option value="">None (Root)</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                    placeholder="/path"
                    value={editForm.path || ''}
                    onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
                  />
                </td>
                <td className="px-6 py-4">
                  <select
                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                    value={editForm.icon || ''}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                  >
                    <option value="">None</option>
                    {Object.keys(iconMap).map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <select
                      className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                      value={visibilityMode}
                      onChange={(e) => {
                        const mode = e.target.value as any;
                        setVisibilityMode(mode);
                        if (mode !== 'users') setEditForm({ ...editForm, visibleToUserIds: [] });
                        if (mode === 'users') openUserPicker();
                      }}
                    >
                      <option value="everyone">Everyone</option>
                      <option value="admin">Admin Only</option>
                      <option value="users">Selected Users</option>
                    </select>
                    {visibilityMode === 'users' ? (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700">
                          {renderSelectedUsersSummary(editForm.visibleToUserIds || [])}
                        </div>
                        <button
                          type="button"
                          aria-label="Add users"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            openUserPicker();
                          }}
                          onClick={openUserPicker}
                          disabled={loadingUsers}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Select users"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={editForm.isActive !== false}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      aria-label="Save item"
                      className={`text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-full hover:bg-green-100 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button
                      onClick={handleCancel}
                      aria-label="Cancel"
                      className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                {editingId === item.id ? (
                  <>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                        value={editForm.order || 0}
                        onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                        value={editForm.label || ''}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                        value={editForm.parentId || ''}
                        onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value || null })}
                      >
                        <option value="">None (Root)</option>
                        {items.filter(i => i.id !== item.id).map(i => (
                          <option key={i.id} value={i.id}>{i.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                        value={editForm.path || ''}
                        onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                        value={editForm.icon || ''}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      >
                        <option value="">None</option>
                        {Object.keys(iconMap).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <select
                          className="w-full text-sm rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700 px-2 py-1"
                          value={visibilityMode}
                          onChange={(e) => {
                            const mode = e.target.value as any;
                            setVisibilityMode(mode);
                            if (mode !== 'users') setEditForm({ ...editForm, visibleToUserIds: [] });
                            if (mode === 'users') openUserPicker();
                          }}
                        >
                          <option value="everyone">Everyone</option>
                          <option value="admin">Admin Only</option>
                          <option value="users">Selected Users</option>
                        </select>
                        {visibilityMode === 'users' ? (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700">
                              {renderSelectedUsersSummary(editForm.visibleToUserIds || [])}
                            </div>
                            <button
                              type="button"
                              aria-label="Add users"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                openUserPicker();
                              }}
                              onClick={openUserPicker}
                              disabled={loadingUsers}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Select users"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          className="rounded text-blue-600 focus:ring-blue-500"
                          checked={editForm.isActive !== false}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        />
                        Active
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          aria-label="Save item"
                          className={`text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-full hover:bg-green-100 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                        </button>
                        <button
                          onClick={handleCancel}
                          aria-label="Cancel"
                          className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{item.order}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${((item as any).level || 0) * 20}px` }}>
                        {item.parentId && <span className="text-slate-300">↳</span>}
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {item.parentId ? items.find(i => i.id === item.parentId)?.label : <span className="text-slate-300 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">{item.path}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-400 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-md inline-block">
                        {renderIcon(item.icon) || <Menu size={16} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderVisibilityBadge(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onMouseDown={() => setUserPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-picker-title"
            aria-describedby="user-picker-desc"
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div id="user-picker-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Select Users
              </div>
              <div id="user-picker-desc" className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select one or more users who can access this module.
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <input
                    ref={userPickerInputRef}
                    value={userPickerQuery}
                    onChange={(e) => setUserPickerQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearPickerSelection}
                    className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                  {loadingUsers ? (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading users...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No users found.</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = userPickerSelected.has(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleUserInPicker(u.id, e.target.checked)}
                            aria-label={`Select ${u.email || u.id}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {u.fullName || u.email || u.id}
                            </div>
                            {u.fullName && u.email ? (
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                            ) : null}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Selected: <span className="font-semibold text-slate-900 dark:text-slate-100">{userPickerSelected.size}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserPickerOpen(false)}
                className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUserPicker}
                disabled={userPickerSelected.size === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
  );
};

export default SidebarManagement;
