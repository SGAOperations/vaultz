'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getCategoriesWithAvailableAmount } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getPurchasesByDesignation } from '@/prisma/services/purchase';
import { getUsers } from '@/prisma/services/user';

import { EmptyState } from '@/components/empty-state';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const { selectedYear } = useYear();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases', designationId, selectedYear?.id],
    queryFn: () =>
      selectedYear
        ? getPurchasesByDesignation({
            designationId,
            yearId: selectedYear.id,
          })
        : Promise.resolve([]),
    enabled: !!selectedYear,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-available', designationId],
    queryFn: () => getCategoriesWithAvailableAmount({ designationId }),
  });

  const { data: allocationGroups } = useQuery({
    queryKey: ['allocation-groups', designationId],
    queryFn: () => getAllAllocationGroups(designationId),
  });

  const { data: miscAllocations } = useQuery({
    queryKey: ['misc-allocations', designationId],
    queryFn: () => getMiscAllocations(designationId),
  });

  const { data: processTemplates } = useQuery({
    queryKey: ['process-templates'],
    queryFn: () => getAllProcessTemplates(true),
  });

  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    if (!categoryId) return purchases;
    return purchases.filter((p) => p.categoryId === categoryId);
  }, [purchases, categoryId]);

  if (!selectedYear)
    return (
      <EmptyState
        message="No fiscal year selected"
        description="Add a fiscal year in the Periods section to view purchases"
      />
    );

  if (purchasesLoading)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreatePurchaseDialog
          users={users ?? []}
          categories={categories ?? []}
          allocationGroups={allocationGroups ?? []}
          miscAllocations={miscAllocations ?? []}
          processTemplates={processTemplates ?? []}
          defaultCategoryId={categoryId ?? undefined}
        />
      </div>
      <PurchaseList
        purchases={filteredPurchases}
        users={users ?? []}
        categories={categories ?? []}
        allocationGroups={allocationGroups ?? []}
        miscAllocations={miscAllocations ?? []}
        processTemplates={processTemplates ?? []}
      />
    </div>
  );
}
