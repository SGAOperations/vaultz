'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

import { Year } from '@/prisma/client';

interface YearContextType {
  years: Year[];
  activeYearId: string | undefined;
  selectedYear: Year | null;
  setSelectedYear: (year: Year) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

interface YearProviderProps {
  years: Year[];
  activeYearId: string | undefined;
  children: ReactNode;
}

export function YearProvider({
  years,
  activeYearId,
  children,
}: YearProviderProps) {
  const [selectedYear, setSelectedYear] = useState<Year | null>(
    () => years.find((y) => y.id === activeYearId) ?? years[0] ?? null,
  );

  return (
    <YearContext.Provider
      value={{ years, activeYearId, selectedYear, setSelectedYear }}
    >
      {children}
    </YearContext.Provider>
  );
}

export function useYear(): YearContextType {
  const context = useContext(YearContext);
  if (context === undefined)
    throw new Error('useYear must be used within a YearProvider');
  return context;
}
