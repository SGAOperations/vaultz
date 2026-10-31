'use client';

import { ReactNode, createContext, useContext } from 'react';

// UX only: server actions enforce capabilities themselves (lib/permissions.ts).
const CanEditContext = createContext(true);

export function CapabilitiesProvider({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: ReactNode;
}) {
  return (
    <CanEditContext.Provider value={canEdit}>
      {children}
    </CanEditContext.Provider>
  );
}

export function useCanEdit(): boolean {
  return useContext(CanEditContext);
}

export function EditOnly({ children }: { children: ReactNode }) {
  return useCanEdit() ? children : null;
}
