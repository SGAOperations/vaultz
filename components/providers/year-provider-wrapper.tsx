'use client';

import { ReactNode } from 'react';

import { YearProvider } from '@/contexts/YearContext';

interface MinimalYear {
  id: string;
  name: string;
}

interface YearProviderWrapperProps {
  initialYear: MinimalYear | null;
  activeYearId: string | undefined;
  children: ReactNode;
}

export function YearProviderWrapper({
  initialYear,
  activeYearId,
  children,
}: YearProviderWrapperProps) {
  return (
    <YearProvider initialYear={initialYear} activeYearId={activeYearId}>
      {children}
    </YearProvider>
  );
}
