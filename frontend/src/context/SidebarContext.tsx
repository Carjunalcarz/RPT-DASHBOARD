import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import sidebarService, { SidebarItem } from '@/services/sidebarService';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setIsCollapsed: (value: boolean) => void;
  menuItems: SidebarItem[];
  refreshMenu: () => Promise<void>;
  loadingMenu: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  const [menuItems, setMenuItems] = useState<SidebarItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuLoaded, setMenuLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored) {
      setIsCollapsedState(JSON.parse(stored));
    }
    refreshMenu();
  }, []);

  const refreshMenu = async () => {
    const isInitialLoad = !menuLoaded;
    try {
      if (isInitialLoad) {
        setLoadingMenu(true);
      }
      const response = await sidebarService.getSidebarItems();
      if (response.success) {
        setMenuItems(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sidebar items:', error);
    } finally {
      setMenuLoaded(true);
      if (isInitialLoad) {
        setLoadingMenu(false);
      }
    }
  };

  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedState(value);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(value));
  };

  const toggleSidebar = () => {
    setIsCollapsedState((prev) => {
      const newValue = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newValue));
      return newValue;
    });
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed, menuItems, refreshMenu, loadingMenu }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
