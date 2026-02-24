'use client';

import { ReactNode } from 'react';

import { Year } from '@/prisma/client';

import { YearProvider } from '@/contexts/YearContext';

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
