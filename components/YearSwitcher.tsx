'use client';

import { useYear } from '@/contexts/YearContext';
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

export function YearSwitcher() {
  const { years, activeYearId, selectedYear, setSelectedYear } = useYear();

  if (years.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="gap-1.5">
          <span className="max-w-[120px] truncate">
            {selectedYear?.name ?? 'Select Year'}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Fiscal Year</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedYear?.id ?? ''}
          onValueChange={(value) => {
            const year = years.find((y) => y.id === value);
            if (year) setSelectedYear(year);
          }}
        >
          {years.map((year) => (
            <DropdownMenuRadioItem key={year.id} value={year.id}>
              {year.name}
              {year.id === activeYearId && (
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
