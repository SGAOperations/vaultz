'use client';

import { ReactNode } from 'react';

import { DesignationProvider, MinimalDesignation } from '@/contexts/DesignationContext';

interface DesignationProviderWrapperProps {
  initialDesignation: MinimalDesignation | null;
  children: ReactNode;
}

export function DesignationProviderWrapper({
  initialDesignation,
  children,
}: DesignationProviderWrapperProps) {
  return (
    <DesignationProvider initialDesignation={initialDesignation}>
      {children}
    </DesignationProvider>
  );
}
