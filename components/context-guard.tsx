'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getDesignations } from '@/prisma/services/designation';
import { getActiveYear, getAllYears } from '@/prisma/services/period';

import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SETUP_PATHS = ['/designation', '/periods'];

export function ContextGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedDesignation, setSelectedDesignation } = useDesignation();
  const { selectedYear, setSelectedYear } = useYear();

  const isSetupPage = SETUP_PATHS.some((p) => pathname.startsWith(p));

  const { data: designations = [], isSuccess: designationsLoaded } = useQuery({
    queryKey: ['designations'],
    queryFn: getDesignations,
    enabled: !isSetupPage,
  });

  const { data: years = [], isSuccess: yearsLoaded } = useQuery({
    queryKey: ['years'],
    queryFn: getAllYears,
    enabled: !isSetupPage,
  });

  const { data: activeYear } = useQuery({
    queryKey: ['active-year'],
    queryFn: getActiveYear,
    enabled: !isSetupPage,
  });

  const allLoaded = designationsLoaded && yearsLoaded;
  const needsDesignation = !selectedDesignation;
  const needsYear = !selectedYear;

  useEffect(() => {
    if (isSetupPage || !allLoaded) return;

    if (needsDesignation && designations.length === 0) {
      toast.info('Please create a designation to get started.');
      router.push('/designation');
    } else if (!needsDesignation && needsYear && years.length === 0) {
      toast.info('Please create a fiscal year to get started.');
      router.push('/periods');
    }
  }, [
    isSetupPage,
    allLoaded,
    needsDesignation,
    needsYear,
    designations.length,
    years.length,
    router,
  ]);

  if (isSetupPage || !allLoaded) return null;

  const willRedirect =
    (needsDesignation && designations.length === 0) ||
    (!needsDesignation && needsYear && years.length === 0);

  if (willRedirect || (!needsDesignation && !needsYear)) return null;

  const missingItems = [
    needsDesignation && 'designation',
    needsYear && 'fiscal year',
  ]
    .filter(Boolean)
    .join(' and ');

  return (
    <Dialog open={true}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select Context</DialogTitle>
          <DialogDescription>
            Please select a {missingItems} to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {needsDesignation && designations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Designation</label>
              <Combobox
                name="designation"
                value=''
                data={[
                  {
                    items: designations.map((designation) => ({
                      label: `${designation.name} (DN${designation.code})`,
                      value: designation.id,
                    })),
                  },
                ]}
                onChange={(value) => {
                  const designation = designations.find((x) => x.id === value);
                  if (designation)
                    setSelectedDesignation({
                      id: designation.id,
                      name: designation.name,
                      code: designation.code,
                      budgetResetBehavior: designation.budgetResetBehavior,
                    });
                }}
              />
            </div>
          )}

          {needsYear && years.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Fiscal Year</label>
              <Combobox
                name="fiscal year"
                value={selectedYear?.id ?? ''}
                data={[
                  {
                    items: years.map((year) => ({
                      label:
                        year.id === activeYear?.id
                          ? `${year.name} (Active)`
                          : year.name,
                      value: year.id,
                    })),
                  },
                ]}
                onChange={(value) => {
                  const year = years.find((x) => x.id === value);
                  if (year) setSelectedYear({ id: year.id, name: year.name });
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
