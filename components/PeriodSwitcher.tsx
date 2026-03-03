'use client';

import { usePathname } from 'next/navigation';

import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown } from 'lucide-react';

import { getActivePeriod, getAllPeriods } from '@/prisma/services/period';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ALLOCATION_PATHS = ['/allocation-groups', '/allocations'];

export function PeriodSwitcher() {
  const pathname = usePathname();
  const { selectedPeriod, setSelectedPeriod } = usePeriod();
  const { selectedYear } = useYear();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: getAllPeriods,
  });

  const { data: activePeriod } = useQuery({
    queryKey: ['active-period'],
    queryFn: getActivePeriod,
  });

  const periodsForYear = periods.filter((p) => p.yearId === selectedYear?.id);

  const isAllocationPage = ALLOCATION_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (!isAllocationPage || periodsForYear.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="gap-1.5">
          <span className="max-w-[120px] truncate">
            {selectedPeriod?.name ?? 'Select Period'}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Period</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedPeriod?.id ?? ''}
          onValueChange={(value) => {
            const period = periods.find((p) => p.id === value);
            if (period) setSelectedPeriod({ id: period.id, name: period.name });
          }}
        >
          {periodsForYear.map((period) => (
            <DropdownMenuRadioItem key={period.id} value={period.id}>
              {period.name}
              {period.id === activePeriod?.id && (
                <span className="text-muted-foreground ml-1 text-xs">
                  (Active)
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
