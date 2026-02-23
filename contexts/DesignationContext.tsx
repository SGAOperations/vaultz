'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

import { Designation } from '@/prisma/client';

interface DesignationContextType {
  activeDesignation: Designation | null;
  designations: Designation[];
  setDesignation: (designation: Designation) => void;
}

const DesignationContext = createContext<DesignationContextType | undefined>(
  undefined,
);

interface DesignationProviderProps {
  designations: Designation[];
  children: ReactNode;
}

export function DesignationProvider({
  designations,
  children,
}: DesignationProviderProps) {
  const [activeDesignation, setActiveDesignation] =
    useState<Designation | null>(() =>
      designations.length > 0 ? designations[0] : null,
    );

  const setDesignation = (designation: Designation) => {
    setActiveDesignation(designation);
  };

  return (
    <DesignationContext.Provider
      value={{ activeDesignation, designations, setDesignation }}
    >
      {children}
    </DesignationContext.Provider>
  );
}

export function useDesignation(): DesignationContextType {
  const context = useContext(DesignationContext);
  if (context === undefined)
    throw new Error('useDesignation must be used within a DesignationProvider');
  return context;
}
