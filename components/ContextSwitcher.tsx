'use client';

import { useState } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown } from 'lucide-react';

import { getDesignations } from '@/prisma/services/designation';
import {
  getActivePeriod,
  getActiveYear,
  getAllPeriods,
  getAllYears,
} from '@/prisma/services/period';

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
  const { selectedPeriod, setSelectedPeriod } = usePeriod();
  const { selectedYear, setSelectedYear } = useYear();
  const { selectedDesignation, setSelectedDesignation } = useDesignation();

  const { data: designations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: getDesignations,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: getAllPeriods,
  });

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: getAllYears,
  });

  const { data: activeYear } = useQuery({
    queryKey: ['active-year'],
    queryFn: getActiveYear,
  });

  const { data: activePeriod } = useQuery({
    queryKey: ['active-period'],
    queryFn: getActivePeriod,
  });

  // Use fresh data from query for display, falling back to context state
  const selectedDesignationName =
    designations.find((d) => d.id === selectedDesignation?.id)?.name ??
    selectedDesignation?.name;

  const selectedPeriodName =
    periods.find((p) => p.id === selectedPeriod?.id)?.name ??
    selectedPeriod?.name;

  const selectedYearName =
    years.find((y) => y.id === selectedYear?.id)?.name ?? selectedYear?.name;

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
          {selectedDesignationName && (
            <span className="text-sm leading-tight font-semibold">
              {selectedDesignationName}
            </span>
          )}
          <span className="text-muted-foreground text-xs leading-tight">
            {[selectedPeriodName, selectedYearName].filter(Boolean).join(' · ')}
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
                  value={selectedDesignation?.id ?? ''}
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
                    if (d)
                      setSelectedDesignation({
                        id: d.id,
                        name: d.name,
                        code: d.code,
                        budgetResetBehavior: d.budgetResetBehavior,
                      });
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
                          p.id === activePeriod?.id
                            ? `${p.year.name} · ${p.name} (Active)`
                            : `${p.year.name} · ${p.name}`,
                        value: p.id,
                      })),
                    },
                  ]}
                  onChange={(value) => {
                    const p = periods.find((x) => x.id === value);
                    if (p) setSelectedPeriod({ id: p.id, name: p.name, yearName: p.year.name });
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
                          y.id === activeYear?.id
                            ? `${y.name} (Active)`
                            : y.name,
                        value: y.id,
                      })),
                    },
                  ]}
                  onChange={(value) => {
                    const y = years.find((x) => x.id === value);
                    if (y) setSelectedYear({ id: y.id, name: y.name });
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
