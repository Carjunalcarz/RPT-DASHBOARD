import React, { useState, useRef, useEffect } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAuth } from '@/context/AuthContext';
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { headerColor, setHeaderColor } = useThemeColor();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

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
          <button
            data-testid="notifications-button"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
          >
            <Bell size={20} className="text-slate-600 dark:text-slate-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

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
