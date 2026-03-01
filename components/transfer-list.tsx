'use client';

import { useYear } from '@/contexts/YearContext';
import { ArrowRight } from 'lucide-react';

import { TransferWithYear } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { EmptyState } from '@/components/empty-state';

export function TransferList({
  transfers,
  categoryId,
}: {
  transfers: TransferWithYear[];
  categoryId: string;
}) {
  const { selectedYear } = useYear();

  const filtered = selectedYear
    ? transfers.filter((t) => t.yearId === selectedYear.id)
    : transfers;

  if (filtered.length === 0)
    return (
      <EmptyState
        message="No transfers yet"
        description="Transfer funds between categories to see them here"
      />
    );

  return (
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
                <span className="font-medium">{transfer.toCategory.name}</span>
              </div>
              {transfer.notes && (
                <p className="text-muted-foreground text-xs">
                  {transfer.notes}
                </p>
              )}
              <span className="text-muted-foreground text-xs">
                <DateTime date={transfer.createdAt} />
              </span>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
