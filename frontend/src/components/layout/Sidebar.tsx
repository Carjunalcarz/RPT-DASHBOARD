import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ClipboardEdit,
  LogOut,
  User,
  FileClock,
  CheckSquare,
  Package
} from 'lucide-react';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/properties', label: 'Property Records', icon: Building2 },
  { path: '/assessment', label: 'Tax Assessment', icon: FileText },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/data-entry', label: 'Data Entry', icon: ClipboardEdit },
  { path: '/items', label: 'Items', icon: Package },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/audit-trail', label: 'Audit Trail', icon: FileClock },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  const { isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      data-testid="sidebar"
      className={`fixed left-0 top-16 h-[calc(100%-4rem)] bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-r border-white/30 dark:border-slate-800/70 shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 my-1 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-2 py-3 border-t border-slate-200 dark:border-slate-800">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center rounded-lg px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                data-testid="sidebar-logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <User size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user?.name || 'Guest'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.role || 'Signed out'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                data-testid="sidebar-logout"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
