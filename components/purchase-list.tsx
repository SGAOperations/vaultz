'use client';

import { User } from '@/prisma/client';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  PurchaseWithUser,
} from '@/lib/types';

import { useYear } from '@/contexts/YearContext';

import { EmptyState } from './empty-state';
import { PurchaseCard } from './purchase-card';

export function PurchaseList({
  purchases,
  users,
  categories,
  allocationGroups,
  miscAllocations,
}: {
  purchases: PurchaseWithUser[];
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  const { selectedYear } = useYear();

  const filteredPurchases = selectedYear
    ? purchases.filter((p) => p.yearId === selectedYear.id)
    : purchases;

  return (
    <div>
      {filteredPurchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending"
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
