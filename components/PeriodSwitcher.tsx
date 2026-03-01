'use client';

import { usePathname } from 'next/navigation';

import { usePeriod } from '@/contexts/PeriodContext';
import { ChevronsUpDown } from 'lucide-react';

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
  const { periods, activePeriodId, selectedPeriod, setSelectedPeriod } =
    usePeriod();

  const isAllocationPage = ALLOCATION_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (!isAllocationPage || periods.length === 0) return null;

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
            if (period) setSelectedPeriod(period);
          }}
        >
          {periods.map((period) => (
            <DropdownMenuRadioItem key={period.id} value={period.id}>
              {period.name}
              {period.id === activePeriodId && (
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
