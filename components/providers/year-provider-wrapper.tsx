'use client';

import { ReactNode } from 'react';

import { YearProvider } from '@/contexts/YearContext';

interface MinimalYear {
  id: string;
  name: string;
}

interface YearProviderWrapperProps {
  initialYear: MinimalYear | null;
  children: ReactNode;
}

export function YearProviderWrapper({
  initialYear,
  children,
}: YearProviderWrapperProps) {
  return <YearProvider initialYear={initialYear}>{children}</YearProvider>;
}
