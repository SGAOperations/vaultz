'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { ChevronDown, Layers, Tag, Wallet, X } from 'lucide-react';

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
  const allocationGroupId = searchParams.get('allocationGroup');
  const allocationId = searchParams.get('allocation');
  const sortField = searchParams.get('sort');
  const sortOrder = searchParams.get('order');

  const sorting: SortingState = useMemo(() => {
    if (!sortField) return [];
    return [{ id: sortField, desc: sortOrder === 'desc' }];
  }, [sortField, sortOrder]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, router, pathname],
  );

  const handleCategoryChange = useCallback(
    (id: string | null) => updateParams({ category: id }),
    [updateParams],
  );

  const handleAllocationGroupChange = useCallback(
    (id: string | null) => updateParams({ allocationGroup: id }),
    [updateParams],
  );

  const handleAllocationChange = useCallback(
    (id: string | null) => updateParams({ allocation: id }),
    [updateParams],
  );

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        updateParams({ sort: null, order: null });
      } else {
        updateParams({
          sort: newSorting[0].id,
          order: newSorting[0].desc ? 'desc' : 'asc',
        });
      }
    },
    [updateParams],
  );

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases', designationId, selectedYear?.id],
    queryFn: () =>
      selectedYear
        ? getPurchasesByDesignation({ designationId, yearId: selectedYear.id })
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
    let result = purchases;
    if (categoryId) result = result.filter((p) => p.categoryId === categoryId);
    if (allocationGroupId) {
      const group = allocationGroups?.find((g) => g.id === allocationGroupId);
      const allocationIds = new Set(group?.allocations.map((a) => a.id) ?? []);
      result = result.filter(
        (p) => p.allocationId != null && allocationIds.has(p.allocationId),
      );
    }
    if (allocationId)
      result = result.filter((p) => p.allocationId === allocationId);
    return result;
  }, [purchases, categoryId, allocationGroupId, allocationId, allocationGroups]);

  const selectedCategoryName = useMemo(() => {
    if (!categoryId || !categories) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  }, [categoryId, categories]);

  const selectedAllocationGroupName = useMemo(() => {
    if (!allocationGroupId || !allocationGroups) return null;
    return allocationGroups.find((g) => g.id === allocationGroupId)?.name ?? null;
  }, [allocationGroupId, allocationGroups]);

  const allAllocations = useMemo(() => {
    const result: { id: string; name: string }[] = [];
    for (const group of allocationGroups ?? []) {
      for (const a of group.allocations) result.push({ id: a.id, name: a.name });
    }
    for (const a of miscAllocations ?? []) result.push({ id: a.id, name: a.name });
    return result;
  }, [allocationGroups, miscAllocations]);

  const selectedAllocationName = useMemo(() => {
    if (!allocationId) return null;
    return allAllocations.find((a) => a.id === allocationId)?.name ?? null;
  }, [allocationId, allAllocations]);

  const hasActiveFilters = !!(categoryId || allocationGroupId || allocationId);

  const categoryFilterLabel = selectedCategoryName ?? 'All Categories';
  const allocationGroupFilterLabel = selectedAllocationGroupName ?? 'All Groups';
  const allocationFilterLabel = selectedAllocationName ?? 'All Allocations';

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Purchases"
        description={
          selectedYear
            ? `${designationName} · ${selectedYear.name}`
            : designationName
        }
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

            {allocationGroups && allocationGroups.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={allocationGroupId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 rounded-full"
                  >
                    <Layers className="size-3.5" />
                    {allocationGroupFilterLabel}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => handleAllocationGroupChange(null)}
                  >
                    All Groups
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {allocationGroups.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onClick={() => handleAllocationGroupChange(g.id)}
                    >
                      {g.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {allAllocations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={allocationId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 rounded-full"
                  >
                    <Wallet className="size-3.5" />
                    {allocationFilterLabel}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleAllocationChange(null)}>
                    All Allocations
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {allAllocations.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => handleAllocationChange(a.id)}
                    >
                      {a.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 rounded-full"
                onClick={() =>
                  updateParams({
                    category: null,
                    allocationGroup: null,
                    allocation: null,
                  })
                }
              >
                <X className="size-3" />
                Clear filters
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
