import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RptManagementThemeProvider } from './rpt_m_ThemeContext';
import { RptManagementThemeToggle } from './rpt_m_ThemeToggle';
import { RPTM_THEME_STORAGE_KEY } from './rpt_m_theme';

const renderWithProvider = () =>
  render(
    <RptManagementThemeProvider>
      <div>content</div>
      <RptManagementThemeToggle />
    </RptManagementThemeProvider>
  );

describe('RptManagementTheme', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });
  });

  it('persists selection to localStorage', () => {
    renderWithProvider();
    const ocean = screen.getByRole('radio', { name: /switch to ocean theme/i });
    fireEvent.click(ocean);
    expect(localStorage.getItem(RPTM_THEME_STORAGE_KEY)).toBe('ocean');
  });

  it('restores selection from localStorage on mount', () => {
    localStorage.setItem(RPTM_THEME_STORAGE_KEY, 'dark');
    renderWithProvider();
    const group = screen.getByRole('radiogroup', { name: /rpt management theme selector/i });
    expect(group.closest('[data-rptm-theme="dark"]')).toBeTruthy();
  });

  it('supports keyboard navigation (ArrowRight)', () => {
    localStorage.setItem(RPTM_THEME_STORAGE_KEY, 'light');
    renderWithProvider();
    const group = screen.getByRole('radiogroup', { name: /rpt management theme selector/i });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(localStorage.getItem(RPTM_THEME_STORAGE_KEY)).toBe('dark');
  });
});
