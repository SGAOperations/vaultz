'use client';

import { useState } from 'react';

import { User } from '@/prisma/client';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  PurchaseWithUser,
  YearRecord,
} from '@/lib/types';

import { EmptyState } from './empty-state';
import { PurchaseCard } from './purchase-card';
import { Combobox } from './ui/combobox';

export function PurchaseList({
  purchases,
  users,
  categories,
  allocationGroups,
  miscAllocations,
  years,
  activeYearId,
}: {
  purchases: PurchaseWithUser[];
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  years: YearRecord[];
  activeYearId?: string;
}) {
  const [selectedYearId, setSelectedYearId] = useState<string>(
    activeYearId ?? 'all',
  );

  const filteredPurchases =
    selectedYearId === 'all'
      ? purchases
      : purchases.filter((p) => p.yearId === selectedYearId);

  function handleYearFilterChange(value: string) {
    if (value) setSelectedYearId(value);
  }

  return (
    <div>
      {years.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Year:</span>
          <div className="w-48">
            <Combobox
              data={[
                {
                  items: [
                    { value: 'all', label: 'All Years' },
                    ...years.map((y) => ({
                      value: y.id,
                      label:
                        y.id === activeYearId
                          ? `${y.name} (Active)`
                          : y.name,
                    })),
                  ],
                },
              ]}
              value={selectedYearId === 'all' ? '' : selectedYearId}
              onChange={handleYearFilterChange}
              name="year filter"
            />
          </div>
        </div>
      )}

      {filteredPurchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description={
            selectedYearId === 'all'
              ? 'Record purchases to track spending'
              : 'No purchases found for the selected year'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredPurchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              categories={categories}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
              years={years}
              activeYearId={activeYearId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
