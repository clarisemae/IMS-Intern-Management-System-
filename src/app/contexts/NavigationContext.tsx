import React, { createContext, ReactNode, useContext } from 'react';

interface NavigationContextValue {
  currentPage: string;
  navigate: (page: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({
  children,
  currentPage,
  navigate,
}: {
  children: ReactNode;
  currentPage: string;
  navigate: (page: string) => void;
}) {
  return (
    <NavigationContext.Provider value={{ currentPage, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }

  return context;
}
