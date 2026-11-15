'use client';

import { useTransition } from 'react';

import { Loader2 } from 'lucide-react';
import { useQueryState } from 'nuqs';

import { Combobox } from '@/components/ui/combobox';

interface DivisionYearPickerProps {
  years: { id: string; name: string }[];
  selectedYearId: string;
}

export function DivisionYearPicker({
  years,
  selectedYearId,
}: DivisionYearPickerProps) {
  const [isPending, startTransition] = useTransition();
  const [, setYear] = useQueryState('year', {
    shallow: false,
    history: 'push',
    startTransition,
  });

  return (
    <div className="flex w-36 shrink-0 items-center gap-2 sm:w-48">
      <Combobox
        name="year"
        data={[{ items: years.map((y) => ({ label: y.name, value: y.id })) }]}
        value={selectedYearId}
        onChange={(yearId) => {
          // Combobox sends '' when the selected item is clicked again.
          if (yearId) setYear(yearId);
        }}
        disabled={isPending}
      />
      {isPending && (
        <Loader2
          className="text-muted-foreground size-4 shrink-0 animate-spin"
          aria-label="Loading year"
        />
      )}
    </div>
  );
}
