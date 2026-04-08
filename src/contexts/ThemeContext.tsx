import { createContext, useContext, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

interface ThemeContextType {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  systemTheme: string | undefined;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeContextHelper>{children}</ThemeContextHelper>
    </NextThemesProvider>
  );
}

function ThemeContextHelper({ children }: { children: ReactNode }) {
  const { theme, setTheme, systemTheme } = useNextThemes();

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      systemTheme
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