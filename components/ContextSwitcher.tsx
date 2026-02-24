'use client';

import { useState } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { CalendarDays, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ContextSwitcher() {
  const [open, setOpen] = useState(false);
  const { periods, activePeriodId, selectedPeriod, setSelectedPeriod } =
    usePeriod();
  const { years, activeYearId, selectedYear, setSelectedYear } = useYear();
  const { activeDesignation, designations, setDesignation } = useDesignation();

  if (periods.length === 0 && years.length === 0 && designations.length === 0)
    return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-auto gap-2 px-3 py-1.5"
      >
        <CalendarDays className="text-muted-foreground size-4 shrink-0" />
        <div className="flex flex-col items-start text-left">
          {selectedPeriod && (
            <span className="text-xs leading-tight font-medium">
              {selectedPeriod.name}
            </span>
          )}
          <span className="text-muted-foreground text-xs leading-tight">
            {[
              selectedYear?.name,
              activeDesignation ? `DN${activeDesignation.code}` : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Context Settings</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {periods.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Period</span>
                <div className="flex flex-col gap-1">
                  {periods.map((period) => (
                    <label
                      key={period.id}
                      className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5"
                    >
                      <input
                        type="radio"
                        name="period"
                        value={period.id}
                        checked={selectedPeriod?.id === period.id}
                        onChange={() => setSelectedPeriod(period)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{period.name}</span>
                      {period.id === activePeriodId && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          Active
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {years.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Fiscal Year</span>
                <div className="flex flex-col gap-1">
                  {years.map((year) => (
                    <label
                      key={year.id}
                      className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5"
                    >
                      <input
                        type="radio"
                        name="year"
                        value={year.id}
                        checked={selectedYear?.id === year.id}
                        onChange={() => setSelectedYear(year)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{year.name}</span>
                      {year.id === activeYearId && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          Active
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {designations.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Designation</span>
                <div className="flex flex-col gap-1">
                  {designations.map((designation) => (
                    <label
                      key={designation.id}
                      className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5"
                    >
                      <input
                        type="radio"
                        name="designation"
                        value={designation.id}
                        checked={activeDesignation?.id === designation.id}
                        onChange={() => setDesignation(designation)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{designation.name}</span>
                      <span className="text-muted-foreground ml-auto font-mono text-xs">
                        DN{designation.code}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
