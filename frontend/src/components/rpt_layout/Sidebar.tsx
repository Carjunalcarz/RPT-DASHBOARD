import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { rptasNavigation } from '@/modules/rptas-standalone/navigation/rptasNavigation';
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
  Package,
  UserCog,
  Database,
  CheckCircle,
  ChevronDown,
  Settings2,
  Menu
} from 'lucide-react';

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
  Menu,
  User
};

interface StaticSidebarItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: StaticSidebarItem[];
  adminOnly?: boolean;
}

// Convert rptasNavigation array to a static internal format
const buildStaticNavigation = (): StaticSidebarItem[] => {
  // We extract just the children of the "rptas" group, or the whole array if not grouped
  const rptasNode = rptasNavigation.find((nav: any) => nav.key === 'rptas') as any;
  const items: any[] = rptasNode?.children || rptasNavigation;

  return items.map((item: any) => ({
    id: item.key,
    label: item.label,
    path: item.path || '#',
    icon: item.icon,
    children: item.children?.map((child: any) => ({
      id: child.key,
      label: child.label,
      path: child.path || '#',
      icon: child.icon
    }))
  }));
};

const staticMenuItems = buildStaticNavigation();

const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('sidebarExpandedItems');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebarExpandedItems', JSON.stringify(expandedItems));
  }, [expandedItems]);

  const isItemActive = (item: StaticSidebarItem): boolean => {
    if (location.pathname === item.path) return true;
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }
    return false;
  };

  const toggleExpand = (itemId: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const filteredMenuItems = useMemo(() => {
    const filterItem = (item: StaticSidebarItem): StaticSidebarItem | null => {
      // Admin check
      const isAdmin = user?.role && ['admin', 'administrator'].includes(user.role.toLowerCase());
      if (item.adminOnly && !isAdmin) {
        return null;
      }

      // Process children
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children
          .map(child => filterItem(child))
          .filter((child): child is StaticSidebarItem => child !== null);
          
        return { ...item, children: filteredChildren };
      }

      return item;
    };

    return staticMenuItems
      .map(item => filterItem(item))
      .filter((item): item is StaticSidebarItem => item !== null);
  }, [user?.role, user?.id]);

  const NavItem: React.FC<{ item: StaticSidebarItem; level: number }> = ({ item, level }) => {
    const Icon = (item.icon && iconMap[item.icon]) || Menu;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = !!expandedItems[item.id];
    const isActive = isItemActive(item);

    // Auto-expand active parents on mount or location change
    useEffect(() => {
      if (isActive && hasChildren && !expandedItems[item.id]) {
        setExpandedItems(prev => ({ ...prev, [item.id]: true }));
      }
    }, [isActive, hasChildren, item.id]);

    return (
      <div role="none">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleExpand(item.id)}
            aria-expanded={isExpanded}
            aria-controls={`submenu-${item.id}`}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`}
            className={`w-full flex items-center gap-3 px-3 py-2.5 my-1 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            {level === 0 && <Icon size={19} className="flex-shrink-0" />}
            {!isCollapsed && (
              <>
                <span className={`text-[13px] font-medium flex-1 text-left ${level > 0 ? 'ml-1' : ''}`}>
                  {level > 0 && <span className="text-slate-300 mr-2" aria-hidden="true">↳</span>}
                  {item.label}
                </span>
                <ChevronDown
                  size={17}
                  className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
        ) : (
          <NavLink
            to={item.path}
            aria-label={`Navigate to ${item.label}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 my-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`
            }
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            {level === 0 && <Icon size={19} className="flex-shrink-0" />}
            {!isCollapsed && (
              <span className={`text-[13px] font-medium ${level > 0 ? 'ml-1' : ''}`}>
                {level > 0 && <span className="text-slate-300 mr-2" aria-hidden="true">↳</span>}
                {item.label}
              </span>
            )}
          </NavLink>
        )}

        {!isCollapsed && hasChildren && (
          <div
            id={`submenu-${item.id}`}
            role="group"
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded
                ? 'max-h-[1000px] opacity-100'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
            style={{ marginLeft: `${level * 4 + 4}px` }}
          >
            <div className="border-l-2 border-slate-100 dark:border-slate-800/50 ml-4 transition-colors duration-300">
              {item.children?.map((child, idx) => (
                <NavItem key={`${child.id}-${child.path || idx}`} item={child} level={level + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      data-testid="sidebar"
      className={`fixed left-0 top-16 h-[calc(100%-4rem)] bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <NavItem key={`${item.id}-${item.path || item.label}`} item={item} level={0} />
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-800">
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
