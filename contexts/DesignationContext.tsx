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
  selectedDesignation: MinimalDesignation | null;
  setSelectedDesignation: (designation: MinimalDesignation) => void;
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
  const [selectedDesignation, setSelectedDesignationState] =
    useState<MinimalDesignation | null>(initialDesignation);

  const setSelectedDesignation = (designation: MinimalDesignation) => {
    if (selectedDesignation) {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes(selectedDesignation.id),
      });
    }
    setSelectedDesignationState(designation);
  };

  return (
    <DesignationContext.Provider value={{ selectedDesignation, setSelectedDesignation }}>
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
