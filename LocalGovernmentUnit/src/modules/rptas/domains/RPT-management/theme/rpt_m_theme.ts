export type RptManagementTheme = 'light' | 'dark' | 'ocean';

export const RPTM_THEME_STORAGE_KEY = 'rpt_m_theme';

export const RPTM_THEMES: Array<{ id: RptManagementTheme; label: string; ariaLabel: string }> = [
  { id: 'light', label: 'Light', ariaLabel: 'Switch to light theme' },
  { id: 'dark', label: 'Dark', ariaLabel: 'Switch to dark theme' },
  { id: 'ocean', label: 'Ocean', ariaLabel: 'Switch to ocean theme' },
];

export const normalizeRptManagementTheme = (value: string | null | undefined): RptManagementTheme => {
  if (value === 'dark' || value === 'ocean' || value === 'light') return value;
  return 'light';
};

