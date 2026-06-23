import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import './rpt_m_themes.css';
import { normalizeRptManagementTheme, RPTM_THEME_STORAGE_KEY, RptManagementTheme } from './rpt_m_theme';

type RptManagementThemeContextValue = {
  theme: RptManagementTheme;
  setTheme: (theme: RptManagementTheme) => void;
};

const RptManagementThemeContext = createContext<RptManagementThemeContextValue | null>(null);

export const useRptManagementTheme = () => {
  const ctx = useContext(RptManagementThemeContext);
  if (!ctx) {
    throw new Error('useRptManagementTheme must be used within RptManagementThemeProvider');
  }
  return ctx;
};

export const RptManagementThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [theme, setThemeState] = useState<RptManagementTheme>(() =>
    normalizeRptManagementTheme(localStorage.getItem(RPTM_THEME_STORAGE_KEY))
  );

  useEffect(() => {
    localStorage.setItem(RPTM_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: RptManagementTheme) => {
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  const wrapperClassName = useMemo(() => {
    const base = `rptm-theme rptm-theme--${theme}`;
    if (theme === 'dark') return `${base} dark`;
    return base;
  }, [theme]);

  return (
    <RptManagementThemeContext.Provider value={value}>
      <div
        className={`${wrapperClassName} h-full w-full bg-background text-foreground transition-colors duration-300`}
        data-rptm-theme={theme}
      >
        {children}
      </div>
    </RptManagementThemeContext.Provider>
  );
};

