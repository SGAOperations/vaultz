'use client';

import { useState } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
                <Combobox
                  name="designation"
                  value={activeDesignation?.id ?? ''}
                  data={[
                    {
                      items: designations.map((d) => ({
                        label: `${d.name} (DN${d.code})`,
                        value: d.id,
                      })),
                    },
                  ]}
                  onChange={(value) => {
                    const d = designations.find((x) => x.id === value);
                    if (d) setDesignation(d);
                  }}
                />
              </div>
            )}

            {periods.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Period</label>
                <Combobox
                  name="period"
                  value={selectedPeriod?.id ?? ''}
                  data={[
                    {
                      items: periods.map((p) => ({
                        label:
                          p.id === activePeriodId
                            ? `${p.name} (Active)`
                            : p.name,
                        value: p.id,
                      })),
                    },
                  ]}
                  onChange={(value) => {
                    const p = periods.find((x) => x.id === value);
                    if (p) setSelectedPeriod(p);
                  }}
                />
              </div>
            )}

            {years.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Fiscal Year</label>
                <Combobox
                  name="fiscal year"
                  value={selectedYear?.id ?? ''}
                  data={[
                    {
                      items: years.map((y) => ({
                        label:
                          y.id === activeYearId ? `${y.name} (Active)` : y.name,
                        value: y.id,
                      })),
                    },
                  ]}
                  onChange={(value) => {
                    const y = years.find((x) => x.id === value);
                    if (y) setSelectedYear(y);
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
