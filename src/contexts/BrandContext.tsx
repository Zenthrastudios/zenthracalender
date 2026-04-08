import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const BRAND_NAME_KEY = 'app-brand-name';
const DEFAULT_BRAND_NAME = 'Zenthra';

interface BrandContextType {
  brandName: string;
  setBrandName: (name: string) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandName, setBrandNameState] = useState<string>(() => {
    // Initialize from localStorage or default
    if (typeof window !== 'undefined') {
      return localStorage.getItem(BRAND_NAME_KEY) || DEFAULT_BRAND_NAME;
    }
    return DEFAULT_BRAND_NAME;
  });

  const setBrandName = (name: string) => {
    const finalName = name.trim() || DEFAULT_BRAND_NAME;
    setBrandNameState(finalName);
    localStorage.setItem(BRAND_NAME_KEY, finalName);
    // Dispatch custom event for components outside React tree
    window.dispatchEvent(new CustomEvent('brandNameChange', { detail: finalName }));
  };

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BRAND_NAME_KEY && e.newValue) {
        setBrandNameState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <BrandContext.Provider value={{ brandName, setBrandName }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}

// Export default brand name for use in non-React contexts (like SEO)
export const getDefaultBrandName = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(BRAND_NAME_KEY) || DEFAULT_BRAND_NAME;
  }
  return DEFAULT_BRAND_NAME;
};
