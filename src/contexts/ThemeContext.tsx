import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme as useNextThemes } from 'next-themes';

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  systemTheme: string; // 'light' or 'dark' based on system preference
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme: nextTheme, setTheme: setNextThemesTheme, systemTheme } = useNextThemes();
  
  // Initialize theme from localStorage or system
  const getInitialTheme = () => {
    // Check for saved theme in localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('app-theme');
      if (savedTheme) {
        return savedTheme;
      }
    }
    // Fall back to system theme or 'light'
    return nextTheme || systemTheme || 'light';
  };
  
  const [appTheme, setAppTheme] = useState<string>(getInitialTheme());

  // Sync next-themes theme with our app theme
  useEffect(() => {
    if (nextTheme !== appTheme) {
      setNextThemesTheme(appTheme);
    }
  }, [appTheme, nextTheme, setNextThemesTheme]);

  // Update app theme when system theme changes (only if no explicit theme set)
  useEffect(() => {
    if (systemTheme && !nextTheme) {
      // Only update if no explicit theme is set in localStorage
      const hasSavedTheme = typeof window !== 'undefined' && localStorage.getItem('app-theme');
      if (!hasSavedTheme) {
        setAppTheme(systemTheme);
      }
    }
  }, [systemTheme, nextTheme]);

  // Persist theme to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-theme', appTheme);
    }
  }, [appTheme]);

  const setTheme = (theme: string) => {
    setAppTheme(theme);
    setNextThemesTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{
      theme: appTheme,
      setTheme,
      systemTheme: systemTheme || 'light'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}