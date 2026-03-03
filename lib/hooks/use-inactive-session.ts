'use client';

import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';

import { getActivePeriod, getActiveYear } from '@/prisma/services/period';

export function useInactiveSession() {
  const { selectedYear } = useYear();
  const { selectedPeriod } = usePeriod();

  const { data: activeYear, isLoading: isLoadingYear } = useQuery({
    queryKey: ['active-year'],
    queryFn: getActiveYear,
  });

  const { data: activePeriod, isLoading: isLoadingPeriod } = useQuery({
    queryKey: ['active-period'],
    queryFn: getActivePeriod,
  });

  const isInactiveYear =
    !isLoadingYear && !!selectedYear && selectedYear.id !== activeYear?.id;
  const isInactivePeriod =
    !isLoadingPeriod &&
    !!selectedPeriod &&
    selectedPeriod.id !== activePeriod?.id;

  return {
    isInactiveYear,
    isInactivePeriod,
    isInactiveSession: isInactiveYear || isInactivePeriod,
    selectedYear,
    selectedPeriod,
    activeYear,
    activePeriod,
  };
}
