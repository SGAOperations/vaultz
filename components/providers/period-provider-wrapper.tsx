'use client';

import { ReactNode } from 'react';

import { PeriodProvider } from '@/contexts/PeriodContext';

interface MinimalPeriod {
  id: string;
  name: string;
  yearName: string;
}

interface PeriodProviderWrapperProps {
  initialPeriod: MinimalPeriod | null;
  children: ReactNode;
}

export function PeriodProviderWrapper({
  initialPeriod,
  children,
}: PeriodProviderWrapperProps) {
  return (
    <PeriodProvider initialPeriod={initialPeriod}>{children}</PeriodProvider>
  );
}
