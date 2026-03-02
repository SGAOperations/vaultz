'use client';

import { ReactNode } from 'react';

import { PeriodProvider } from '@/contexts/PeriodContext';

interface MinimalPeriod {
  id: string;
  name: string;
}

interface PeriodProviderWrapperProps {
  initialPeriod: MinimalPeriod | null;
  activePeriodId: string | undefined;
  children: ReactNode;
}

export function PeriodProviderWrapper({
  initialPeriod,
  activePeriodId,
  children,
}: PeriodProviderWrapperProps) {
  return (
    <PeriodProvider initialPeriod={initialPeriod} activePeriodId={activePeriodId}>
      {children}
    </PeriodProvider>
  );
}
