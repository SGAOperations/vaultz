'use client';

import { useTransition } from 'react';

import { Loader2 } from 'lucide-react';
import { parseAsString, useQueryStates } from 'nuqs';

import { Combobox } from '@/components/ui/combobox';

interface Option {
  id: string;
  name: string;
}

// A combobox bound to a URL search param. Choosing a value can clear other
// params that depend on it, such as the period when the year changes.
function QueryPicker({
  param,
  name,
  options,
  selectedId,
  clears = [],
}: {
  param: string;
  name: string;
  options: Option[];
  selectedId: string;
  clears?: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(
    Object.fromEntries([param, ...clears].map((key) => [key, parseAsString])),
    { shallow: false, history: 'push', startTransition },
  );

  return (
    <div className="flex w-36 shrink-0 items-center gap-2 sm:w-48">
      <Combobox
        name={name}
        data={[{ items: options.map((o) => ({ label: o.name, value: o.id })) }]}
        value={selectedId}
        onChange={(id) => {
          // Combobox sends '' when the selected item is clicked again.
          if (!id) return;
          setParams({
            [param]: id,
            ...Object.fromEntries(clears.map((key) => [key, null])),
          });
        }}
        disabled={isPending}
      />
      {isPending && (
        <Loader2
          className="text-muted-foreground size-4 shrink-0 animate-spin"
          aria-label={`Loading ${name}`}
        />
      )}
    </div>
  );
}

export function DivisionYearPicker({
  years,
  selectedYearId,
}: {
  years: Option[];
  selectedYearId: string;
}) {
  return (
    <QueryPicker
      param="year"
      name="year"
      options={years}
      selectedId={selectedYearId}
      clears={['period']}
    />
  );
}

export function DivisionPeriodPicker({
  periods,
  selectedPeriodId,
}: {
  periods: Option[];
  selectedPeriodId: string;
}) {
  return (
    <QueryPicker
      param="period"
      name="period"
      options={periods}
      selectedId={selectedPeriodId}
    />
  );
}
