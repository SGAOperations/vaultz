'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { BudgetResetBehavior } from '@/prisma/client';

export interface MinimalDesignation {
  id: string;
  name: string;
  code: string;
  budgetResetBehavior: BudgetResetBehavior;
}

interface DesignationContextType {
  activeDesignation: MinimalDesignation | null;
  setDesignation: (designation: MinimalDesignation) => void;
}

const DesignationContext = createContext<DesignationContextType | undefined>(
  undefined,
);

interface DesignationProviderProps {
  initialDesignation: MinimalDesignation | null;
  children: ReactNode;
}

export function DesignationProvider({
  initialDesignation,
  children,
}: DesignationProviderProps) {
  const queryClient = useQueryClient();
  const [activeDesignation, setActiveDesignation] =
    useState<MinimalDesignation | null>(initialDesignation);

  const setDesignation = (designation: MinimalDesignation) => {
    if (activeDesignation) {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes(activeDesignation.id),
      });
    }
    setActiveDesignation(designation);
  };

  return (
    <DesignationContext.Provider value={{ activeDesignation, setDesignation }}>
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
