'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

interface MinimalYear {
  id: string;
  name: string;
}

interface YearContextType {
  activeYearId: string | undefined;
  selectedYear: MinimalYear | null;
  setSelectedYear: (year: MinimalYear) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

interface YearProviderProps {
  initialYear: MinimalYear | null;
  activeYearId: string | undefined;
  children: ReactNode;
}

export function YearProvider({
  initialYear,
  activeYearId,
  children,
}: YearProviderProps) {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYearState] = useState<MinimalYear | null>(
    initialYear,
  );

  const setSelectedYear = (year: MinimalYear) => {
    if (selectedYear) {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes(selectedYear.id),
      });
    }
    setSelectedYearState(year);
  };

  return (
    <YearContext.Provider value={{ activeYearId, selectedYear, setSelectedYear }}>
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
