'use client';

import { ReactNode } from 'react';

import { YearProvider } from '@/contexts/YearContext';

import { Year } from '@/prisma/client';

interface YearProviderWrapperProps {
  years: Year[];
  activeYearId: string | undefined;
  children: ReactNode;
}

export function YearProviderWrapper({
  years,
  activeYearId,
  children,
}: YearProviderWrapperProps) {
  return (
    <YearProvider years={years} activeYearId={activeYearId}>
      {children}
    </YearProvider>
  );
}
