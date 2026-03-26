import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import sidebarService, { SidebarItem } from '@/services/sidebarService';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setIsCollapsed: (value: boolean) => void;
  menuItems: SidebarItem[];
  dbMenuItems: SidebarItem[];
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
  const [dbMenuItems, setDbMenuItems] = useState<SidebarItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const lastRefreshAtRef = useRef<number>(0);

  const readCachedDbMenu = (): SidebarItem[] => {
    try {
      const raw = localStorage.getItem('sidebarDbItemsCache');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.data) ? parsed.data : [];
    } catch {
      return [];
    }
  };

  const writeCachedDbMenu = (data: SidebarItem[]) => {
    try {
      localStorage.setItem('sidebarDbItemsCache', JSON.stringify({ ts: Date.now(), data }));
    } catch {
    }
  };

  const clearCachedDbMenu = () => {
    try {
      localStorage.removeItem('sidebarDbItemsCache');
    } catch {
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored) {
      setIsCollapsedState(JSON.parse(stored));
    }
    const cachedDb = readCachedDbMenu();
    if (cachedDb.length) setDbMenuItems(cachedDb);
    if (cachedDb.length) setMenuItems(cachedDb);
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
        writeCachedDbMenu(response.data);
        setDbMenuItems(response.data);
        setMenuItems(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sidebar items:', error);
      const cachedDb = readCachedDbMenu();
      if (cachedDb.length) setDbMenuItems(cachedDb);
      if (cachedDb.length) setMenuItems(cachedDb);
    } finally {
      lastRefreshAtRef.current = Date.now();
      setMenuLoaded(true);
      if (isInitialLoad) {
        setLoadingMenu(false);
      }
    }
  };

  useEffect(() => {
    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 15000) return;
      refreshMenu();
    };

    const onFocus = () => maybeRefresh();
    const onVisibility = () => {
      if (!document.hidden) maybeRefresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [menuLoaded]);

  useEffect(() => {
    const onLogout = () => {
      clearCachedDbMenu();
      setMenuItems([]);
      setDbMenuItems([]);
      setMenuLoaded(false);
      setLoadingMenu(false);
    };

    const onRoleChanged = () => {
      clearCachedDbMenu();
      refreshMenu();
    };

    const onLogin = () => {
      refreshMenu();
    };

    window.addEventListener('auth:logout', onLogout);
    window.addEventListener('auth:login', onLogin);
    window.addEventListener('auth:role_changed', onRoleChanged);
    return () => {
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener('auth:login', onLogin);
      window.removeEventListener('auth:role_changed', onRoleChanged);
    };
  }, [menuLoaded]);

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
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed, menuItems, dbMenuItems, refreshMenu, loadingMenu }}>
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
