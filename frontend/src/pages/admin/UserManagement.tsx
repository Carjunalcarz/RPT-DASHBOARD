import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, getUsers, updateUser } from '@/services/userService';
import { useThemeColor } from '@/context/ThemeColorContext';
import { Edit2, Save, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { headerColor } = useThemeColor();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<{ role: string; municipalityCode: string; fullName: string; contactNo: string }>({
    role: 'user',
    municipalityCode: '',
    fullName: '',
    contactNo: ''
  });

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
    if (user?.role !== 'admin') {
        toast.error('Access Denied. Admins only.');
        return;
    }
    fetchUsers();
  }, [user]);

  if (user?.role !== 'admin') {
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
          <button
            onClick={fetchUsers}
            className="p-2 text-white bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Refresh Users"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-blue-100 text-sm mt-1">View all registered users from Supabase Backend</p>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
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
                      <button
                        onClick={() => handleEdit(u)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
