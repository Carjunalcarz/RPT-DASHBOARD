import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode; defaultTheme?: string }> = ({ children, defaultTheme }) => {
  // Force light theme state
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // 1. Force save preference to local storage
    localStorage.setItem('theme', 'light');
    
    // 2. Immediately strip any dark mode styling from the document root
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';

    // 3. Set up a MutationObserver to actively defend against any script
    // attempting to re-add the 'dark' class (e.g. from other modules or OS syncs)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            root.classList.add('light');
            console.warn('Dark mode is permanently disabled. Overriding layout back to light mode.');
          }
          if (root.style.colorScheme === 'dark') {
            root.style.colorScheme = 'light';
          }
        }
      });
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => observer.disconnect();
  }, []);

  const setTheme = (newTheme: Theme) => {
    // Ignore dark mode attempts and firmly maintain light mode
    if (newTheme === 'dark') {
      console.warn('Dark mode has been permanently disabled in the application settings.');
    }
    setThemeState('light');
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  };

  const toggleTheme = () => {
    // Override toggle behavior
    setTheme('light');
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
