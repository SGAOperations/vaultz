'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

import { Period } from '@/prisma/client';

interface PeriodContextType {
  periods: Period[];
  activePeriodId: string | undefined;
  selectedPeriod: Period | null;
  setSelectedPeriod: (period: Period) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

interface PeriodProviderProps {
  periods: Period[];
  activePeriodId: string | undefined;
  children: ReactNode;
}

export function PeriodProvider({
  periods,
  activePeriodId,
  children,
}: PeriodProviderProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(
    () => periods.find((p) => p.id === activePeriodId) ?? periods[0] ?? null,
  );

  return (
    <PeriodContext.Provider
      value={{ periods, activePeriodId, selectedPeriod, setSelectedPeriod }}
    >
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
