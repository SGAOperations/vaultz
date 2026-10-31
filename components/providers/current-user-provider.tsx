'use client';

import { ReactNode, createContext, useContext } from 'react';

const CurrentUserIdContext = createContext<string | null>(null);

export function CurrentUserProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  return (
    <CurrentUserIdContext.Provider value={userId}>
      {children}
    </CurrentUserIdContext.Provider>
  );
}

export function useCurrentUserId(): string | null {
  return useContext(CurrentUserIdContext);
}
