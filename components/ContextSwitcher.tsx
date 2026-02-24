'use client';

import { useState } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { ChevronsUpDown } from 'lucide-react';

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
        <div className="flex flex-col items-start text-left">
          {activeDesignation && (
            <span className="text-sm leading-tight font-semibold">
              {activeDesignation.name}
            </span>
          )}
          <span className="text-muted-foreground text-xs leading-tight">
            {[selectedPeriod?.name, selectedYear?.name]
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

          <div className="flex flex-col gap-4">
            {designations.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Designation</label>
                <select
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={activeDesignation?.id ?? ''}
                  onChange={(e) => {
                    const d = designations.find((x) => x.id === e.target.value);
                    if (d) setDesignation(d);
                  }}
                >
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (DN{d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periods.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Period</label>
                <select
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={selectedPeriod?.id ?? ''}
                  onChange={(e) => {
                    const p = periods.find((x) => x.id === e.target.value);
                    if (p) setSelectedPeriod(p);
                  }}
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.id === activePeriodId ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {years.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Fiscal Year</label>
                <select
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={selectedYear?.id ?? ''}
                  onChange={(e) => {
                    const y = years.find((x) => x.id === e.target.value);
                    if (y) setSelectedYear(y);
                  }}
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.id === activeYearId ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
