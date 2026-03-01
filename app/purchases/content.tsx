'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useYear } from '@/contexts/YearContext';
import { SortingState } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Tag, X } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getCategoriesWithAvailableAmount } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getPurchasesByDesignation } from '@/prisma/services/purchase';
import { getUsers } from '@/prisma/services/user';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentProps {
  designationId: string;
  designationName: string;
}

export function Content({ designationId, designationName }: ContentProps) {
  const { selectedYear } = useYear();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const categoryId = searchParams.get('category');
  const sortField = searchParams.get('sort');
  const sortOrder = searchParams.get('order');

  const sorting: SortingState = useMemo(() => {
    if (!sortField) return [];
    return [{ id: sortField, desc: sortOrder === 'desc' }];
  }, [sortField, sortOrder]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleCategoryChange = (id: string | null) =>
    updateParams({ category: id });

  const handleSortingChange = (newSorting: SortingState) => {
    if (newSorting.length === 0) {
      updateParams({ sort: null, order: null });
    } else {
      updateParams({
        sort: newSorting[0].id,
        order: newSorting[0].desc ? 'desc' : 'asc',
      });
    }
  };

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

  const selectedCategoryName = useMemo(() => {
    if (!categoryId || !categories) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  }, [categoryId, categories]);

  const categoryFilterLabel = selectedCategoryName ?? 'All Categories';

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Purchases"
        description={designationName}
        actions={
          <CreatePurchaseDialog
            users={users ?? []}
            categories={categories ?? []}
            allocationGroups={allocationGroups ?? []}
            miscAllocations={miscAllocations ?? []}
            processTemplates={processTemplates ?? []}
            defaultCategoryId={categoryId ?? undefined}
          />
        }
      />

      {!selectedYear ? (
        <EmptyState
          message="No fiscal year selected"
          description="Add a fiscal year in the Periods section to view purchases"
        />
      ) : purchasesLoading ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-44" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={categoryId ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 rounded-full"
                >
                  <Tag className="size-3.5" />
                  {categoryFilterLabel}
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleCategoryChange(null)}>
                  All Categories
                </DropdownMenuItem>
                {categories && categories.length > 0 && (
                  <DropdownMenuSeparator />
                )}
                {categories?.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => handleCategoryChange(c.id)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {categoryId && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 rounded-full"
                onClick={() => handleCategoryChange(null)}
              >
                <X className="size-3" />
                Clear filter
              </Button>
            )}
          </div>

          <PurchaseList
            purchases={filteredPurchases}
            users={users ?? []}
            categories={categories ?? []}
            allocationGroups={allocationGroups ?? []}
            miscAllocations={miscAllocations ?? []}
            processTemplates={processTemplates ?? []}
            sorting={sorting}
            onSortingChange={handleSortingChange}
          />
        </div>
      )}
    </div>
  );
}
