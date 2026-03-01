'use client';

import { ReactNode } from 'react';

import { PeriodProvider } from '@/contexts/PeriodContext';

import { Period } from '@/prisma/client';

interface PeriodProviderWrapperProps {
  periods: Period[];
  activePeriodId: string | undefined;
  children: ReactNode;
}

export function PeriodProviderWrapper({
  periods,
  activePeriodId,
  children,
}: PeriodProviderWrapperProps) {
  return (
    <PeriodProvider periods={periods} activePeriodId={activePeriodId}>
      {children}
    </PeriodProvider>
  );
}
