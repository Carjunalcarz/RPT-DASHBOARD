import React, { createContext, useContext, useState } from 'react';

type LayoutMode = 'main' | 'rpt';

interface LayoutToggleContextType {
  layoutMode: LayoutMode;
  toggleLayout: () => void;
}

const LayoutToggleContext = createContext<LayoutToggleContextType | undefined>(undefined);

export const LayoutToggleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return (localStorage.getItem('app_layout_mode') as LayoutMode) || 'main';
  });

  const toggleLayout = () => {
    setLayoutMode(prev => {
      const next = prev === 'main' ? 'rpt' : 'main';
      localStorage.setItem('app_layout_mode', next);
      return next;
    });
  };

  return (
    <LayoutToggleContext.Provider value={{ layoutMode, toggleLayout }}>
      {children}
    </LayoutToggleContext.Provider>
  );
};

export const useLayoutToggle = () => {
  const context = useContext(LayoutToggleContext);
  if (!context) {
    throw new Error('useLayoutToggle must be used within LayoutToggleProvider');
  }
  return context;
};
