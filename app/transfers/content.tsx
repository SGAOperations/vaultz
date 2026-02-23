'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { getTransfers } from '@/prisma/services/transfer';

import { YearRecord } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentProps {
  years: YearRecord[];
  activeYearId?: string;
}

export function Content({ years, activeYearId }: ContentProps) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId ?? '');

  const {
    data: transfers,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['transfers', selectedYearId],
    queryFn: () => getTransfers(selectedYearId || undefined),
  });

  const yearComboboxData = [
    {
      items: [
        { label: 'All years', value: '' },
        ...years.map((y) => ({ label: y.name, value: y.id })),
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="w-48">
        <Combobox
          data={yearComboboxData}
          value={selectedYearId}
          onChange={setSelectedYearId}
          name="year"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState message="Failed to load transfers" />
      ) : !transfers || transfers.length === 0 ? (
        <EmptyState
          message="No transfers yet"
          description="Create a transfer to move budget between categories"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {transfers.map((transfer) => (
            <Card key={transfer.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">
                    {transfer.fromCategory.name}
                  </span>
                  <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  <span className="font-semibold">
                    {transfer.toCategory.name}
                  </span>
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    {transfer.year.name}
                  </span>
                </div>
                <span className="text-lg font-bold">
                  {formatCurrency(transfer.amount)}
                </span>
              </div>
              {transfer.notes && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {transfer.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
