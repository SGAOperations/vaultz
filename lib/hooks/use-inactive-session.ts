'use client';

import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';

import { getActivePeriods, getActiveYear } from '@/prisma/services/period';

export function useInactiveSession() {
  const { selectedYear } = useYear();
  const { selectedPeriod } = usePeriod();

  const { data: activeYear, isLoading: isLoadingYear } = useQuery({
    queryKey: ['active-year'],
    queryFn: getActiveYear,
  });

  const { data: activePeriods, isLoading: isLoadingPeriod } = useQuery({
    queryKey: ['active-periods'],
    queryFn: getActivePeriods,
  });

  const isInactiveYear =
    !isLoadingYear && !!selectedYear && selectedYear.id !== activeYear?.id;
  const isInactivePeriod =
    !isLoadingPeriod &&
    !!selectedPeriod &&
    !activePeriods?.some((period) => period.id === selectedPeriod.id);

  return {
    isInactiveYear,
    isInactivePeriod,
    isInactiveSession: isInactiveYear || isInactivePeriod,
    selectedYear,
    selectedPeriod,
    activeYear,
    activePeriods,
  };
}
