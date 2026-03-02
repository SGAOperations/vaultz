'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

interface MinimalPeriod {
  id: string;
  name: string;
}

interface PeriodContextType {
  selectedPeriod: MinimalPeriod | null;
  setSelectedPeriod: (period: MinimalPeriod) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

interface PeriodProviderProps {
  initialPeriod: MinimalPeriod | null;
  children: ReactNode;
}

export function PeriodProvider({
  initialPeriod,
  children,
}: PeriodProviderProps) {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriodState] =
    useState<MinimalPeriod | null>(initialPeriod);

  const setSelectedPeriod = (period: MinimalPeriod) => {
    if (selectedPeriod) {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes(selectedPeriod.id),
      });
    }
    setSelectedPeriodState(period);
  };

  return (
    <PeriodContext.Provider value={{ selectedPeriod, setSelectedPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextType {
  const context = useContext(PeriodContext);
  if (context === undefined)
    throw new Error('usePeriod must be used within a PeriodProvider');
  return context;
}
