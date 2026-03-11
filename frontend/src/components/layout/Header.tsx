import React, { useState, useRef, useEffect } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAuth } from '@/context/AuthContext';
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, Palette } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listFaasRecords } from '@/services/faasService';
import { toast } from 'sonner';

const Header: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { headerColor, setHeaderColor } = useThemeColor();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [pendingCount, setPendingCount] = useState(0);
  const [municipalCount, setMunicipalCount] = useState(0);
  const [provincialCount, setProvincialCount] = useState(0);
  const previousCountRef = useRef(0);

  // Check if user is admin (case-insensitive)
  const isAdmin = user?.role && ['admin', 'administrator'].includes(user.role.toLowerCase());

  useEffect(() => {
    // console.log('Header Debug: User Role:', user?.role);
    // console.log('Header Debug: Is Admin:', isAdmin);
  }, [user, isAdmin]);

  const fetchPendingApprovals = async (silent = false) => {
    if (!isAdmin) {
        return;
    }
    
    try {
      // Fetch Municipal
      const muniResponse = await listFaasRecords({ status: 'pending-municipal', limit: 1 });
      const muniTotal = muniResponse?.pagination?.total || 0;

      // Fetch Provincial
      const provResponse = await listFaasRecords({ status: 'pending-provincial', limit: 1 });
      const provTotal = provResponse?.pagination?.total || 0;
      
      const total = muniTotal + provTotal;
      
      setPendingCount(total);
      setMunicipalCount(muniTotal);
      setProvincialCount(provTotal);
      
      // If not silent (initial load) and count increased, show notification
      const prev = previousCountRef.current;
      if (!silent && total > prev && prev !== 0) {
        const diff = total - prev;
        toast.info(`New Approval Request${diff > 1 ? 's' : ''}`, {
          description: `${diff} new propert${diff > 1 ? 'ies' : 'y'} awaiting review.`,
          action: {
            label: 'View',
            onClick: () => navigate('/approvals')
          }
        });
      }
      
      previousCountRef.current = total;
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    if (isAdmin) {
      fetchPendingApprovals(true); // Initial silent fetch

      const intervalId = setInterval(() => {
        fetchPendingApprovals();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(intervalId);
    }
  }, [isAdmin]); // Removed previousCount dependency as we use ref now

  // Refresh count when navigating to pending approvals to ensure it's up to date
  useEffect(() => {
    if (location.pathname === '/approvals' && isAdmin) {
      fetchPendingApprovals(true);
    }
  }, [location.pathname, isAdmin]);

  const handleNotificationClick = (tab?: 'municipal' | 'provincial') => {
    // If called from an event handler without args, tab will be the event object
    // We need to check if tab is actually a string before using it
    const targetTab = typeof tab === 'string' ? tab : undefined;
    
    navigate('/approvals', { state: { defaultTab: targetTab } });
    // Optionally we could reset a "new" indicator here, 
    // but the count reflects actual pending items, so it stays until they are approved.
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowProfileDropdown(false);
  };

  const predefinedColors = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#16a34a', // green-600
    '#ea580c', // orange-600
    '#9333ea', // purple-600
    '#0891b2', // cyan-600
    '#db2777', // pink-600
    '#65a30d', // lime-600
  ];

  return (
    <header
      data-testid="header"
      className="fixed top-0 right-0 left-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40"
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            data-testid="sidebar-toggle"
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RP</span>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm hidden sm:block">
              Tax Admin System
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              data-testid="global-search"
              type="text"
              placeholder="Search properties, tax records, payments..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Color Picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              data-testid="color-picker-toggle"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Change header color"
            >
              <Palette size={20} className="text-slate-600 dark:text-slate-400" />
            </button>

            {showColorPicker && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-50">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                  Choose Header Color
                </h3>
                
                {/* Predefined Colors */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setHeaderColor(color);
                        setShowColorPicker(false);
                      }}
                      className="w-12 h-12 rounded-lg border-2 border-slate-200 dark:border-slate-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      {headerColor === color && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Color Picker */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-2 block">
                    Custom Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 dark:border-slate-600"
                    />
                    <input
                      type="text"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            data-testid="theme-toggle"
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'light' ? (
              <Moon size={20} className="text-slate-600 dark:text-slate-400" />
            ) : (
              <Sun size={20} className="text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative group">
            <button
              data-testid="notifications-button"
              onClick={() => handleNotificationClick()}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
              title={pendingCount > 0 ? `${pendingCount} Pending Approvals` : 'No Notifications'}
            >
              <Bell size={20} className="text-slate-600 dark:text-slate-400" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
            
            {/* Hover Modal for Notifications */}
            {pendingCount > 0 && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pending Approvals</h3>
                  <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {pendingCount} New
                  </span>
                </div>
                <div className="space-y-3">
                  {municipalCount > 0 && (
                    <div 
                      className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleNotificationClick('municipal')}
                    >
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        You have <span className="font-bold text-slate-900 dark:text-white">{municipalCount}</span> propert{municipalCount > 1 ? 'ies' : 'y'} awaiting <span className="font-semibold text-blue-600 dark:text-blue-400">municipal</span> review.
                      </p>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        Action Required
                      </div>
                    </div>
                  )}
                  {provincialCount > 0 && (
                    <div 
                      className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleNotificationClick('provincial')}
                    >
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        You have <span className="font-bold text-slate-900 dark:text-white">{provincialCount}</span> propert{provincialCount > 1 ? 'ies' : 'y'} awaiting <span className="font-semibold text-purple-600 dark:text-purple-400">provincial</span> review.
                      </p>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        Action Required
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={() => handleNotificationClick()}
                    className="w-full py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    View All Approvals
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              data-testid="profile-button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div
                data-testid="profile-dropdown"
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2"
              >
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  data-testid="profile-menu-item"
                  onClick={() => {
                    navigate('/settings');
                    setShowProfileDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <User size={16} />
                  <span>My Profile</span>
                </button>
                <button
                  data-testid="settings-menu-item"
                  onClick={() => {
                    navigate('/settings');
                    setShowProfileDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Settings size={16} />
                  <span>Account Settings</span>
                </button>
                <button
                  data-testid="logout-button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
