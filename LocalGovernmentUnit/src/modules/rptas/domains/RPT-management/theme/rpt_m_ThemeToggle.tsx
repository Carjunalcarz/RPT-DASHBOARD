import React, { useMemo } from 'react';
import { Droplets, Moon, Sun } from 'lucide-react';
import { useRptManagementTheme } from './rpt_m_ThemeContext';
import { RPTM_THEMES, RptManagementTheme } from './rpt_m_theme';

const iconFor = (theme: RptManagementTheme) => {
  if (theme === 'dark') return Moon;
  if (theme === 'ocean') return Droplets;
  return Sun;
};

export const RptManagementThemeToggle: React.FC = () => {
  const { theme, setTheme } = useRptManagementTheme();
  const activeIndex = useMemo(() => RPTM_THEMES.findIndex((t) => t.id === theme), [theme]);

  const indicatorTransform = useMemo(() => {
    if (activeIndex <= 0) return 'translate-x-0';
    if (activeIndex === 1) return 'translate-x-full';
    return 'translate-x-[200%]';
  }, [activeIndex]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const key = e.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
    e.preventDefault();

    const max = RPTM_THEMES.length - 1;
    const nextIndex =
      key === 'Home'
        ? 0
        : key === 'End'
          ? max
          : key === 'ArrowLeft'
            ? (activeIndex - 1 + RPTM_THEMES.length) % RPTM_THEMES.length
            : (activeIndex + 1) % RPTM_THEMES.length;

    setTheme(RPTM_THEMES[nextIndex].id);
  };

  return (
    <div className="flex items-center justify-end">
      <div
        role="radiogroup"
        aria-label="RPT Management theme selector"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative inline-flex items-center rounded-full border border-border bg-muted/30 p-1 shadow-sm"
      >
        <div
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-background shadow transition-transform duration-300 ${indicatorTransform}`}
        />

        {RPTM_THEMES.map((t) => {
          const Icon = iconFor(t.id);
          const selected = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t.ariaLabel}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTheme(t.id)}
              className={`relative z-10 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                selected ? 'text-foreground' : 'text-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

