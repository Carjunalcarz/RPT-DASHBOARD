import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeColorContextType {
  headerColor: string;
  headerColorDark: string;
  setHeaderColor: (color: string) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

// Function to darken a color
const darkenColor = (hex: string, percent: number = 40): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100)));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export const ThemeColorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerColor, setHeaderColor] = useState<string>(() => {
    const saved = localStorage.getItem('headerColor');
    return saved || '#7a1a1a'; // default maroon
  });

  const headerColorDark = darkenColor(headerColor);

  useEffect(() => {
    localStorage.setItem('headerColor', headerColor);
  }, [headerColor]);

  return (
    <ThemeColorContext.Provider value={{ headerColor, headerColorDark, setHeaderColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
};

export const useThemeColor = () => {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error('useThemeColor must be used within a ThemeColorProvider');
  }
  return context;
};