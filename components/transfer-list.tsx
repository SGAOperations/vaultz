'use client';

import { useState } from 'react';

import { ArrowRight } from 'lucide-react';

import { TransferWithYear, YearRecord } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { Combobox } from '@/components/ui/combobox';

export function TransferList({
  transfers,
  years,
  categoryId,
}: {
  transfers: TransferWithYear[];
  years: YearRecord[];
  categoryId: string;
}) {
  const [filterYearId, setFilterYearId] = useState('');

  const filtered = filterYearId
    ? transfers.filter((t) => t.yearId === filterYearId)
    : transfers;

  const yearItems = [
    { value: '', label: 'All years' },
    ...years.map((y) => ({ value: y.id, label: y.name })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="w-48">
        <Combobox
          data={[{ items: yearItems }]}
          value={filterYearId}
          onChange={(value) =>
            setFilterYearId(value === filterYearId ? '' : value)
          }
          name="year"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No transfers found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((transfer) => {
            const isOutgoing = transfer.fromCategoryId === categoryId;
            return (
              <div
                key={transfer.id}
                className="bg-card flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {transfer.fromCategory.name}
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    <span className="font-medium">
                      {transfer.toCategory.name}
                    </span>
                  </div>
                  {transfer.notes && (
                    <p className="text-muted-foreground text-xs">
                      {transfer.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={
                      isOutgoing
                        ? 'text-destructive font-semibold'
                        : 'font-semibold text-green-600 dark:text-green-400'
                    }
                  >
                    {isOutgoing ? '-' : '+'}${formatNumber(transfer.amount)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {transfer.year.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
