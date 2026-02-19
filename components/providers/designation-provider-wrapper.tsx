'use client';

import { ReactNode } from 'react';

import { DesignationProvider } from '@/contexts/DesignationContext';

import { Designation } from '@/prisma/client';

interface DesignationProviderWrapperProps {
  designations: Designation[];
  children: ReactNode;
}

export function DesignationProviderWrapper({
  designations,
  children,
}: DesignationProviderWrapperProps) {
  return (
    <DesignationProvider designations={designations}>
      {children}
    </DesignationProvider>
  );
}
