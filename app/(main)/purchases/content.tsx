'use client';

import { useMemo } from 'react';

import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { ChevronDown, Layers, Tag, Wallet, X } from 'lucide-react';
import { useQueryState } from 'nuqs';

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

  const [categoryId, setCategoryId] = useQueryState('category');
  const [allocationGroupId, setAllocationGroupId] = useQueryState('allocationGroup');
  const [allocationId, setAllocationId] = useQueryState('allocation');
  const [sortField, setSortField] = useQueryState('sort');
  const [sortOrder, setSortOrder] = useQueryState('order');

  const sorting: SortingState = sortField
    ? [{ id: sortField, desc: sortOrder === 'desc' }]
    : [];

  const handleSortingChange = (newSorting: SortingState) => {
    if (newSorting.length === 0) {
      setSortField(null);
      setSortOrder(null);
    } else {
      setSortField(newSorting[0].id);
      setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
    }
  };

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
    queryKey: ['allocation-groups', designationId, selectedYear?.id],
    queryFn: () => getAllAllocationGroups(designationId, undefined, selectedYear?.id),
  });

  const { data: miscAllocations } = useQuery({
    queryKey: ['misc-allocations', designationId, selectedYear?.id],
    queryFn: () => getMiscAllocations(designationId, undefined, selectedYear?.id),
  });

  const { data: processTemplates } = useQuery({
    queryKey: ['process-templates'],
    queryFn: () => getAllProcessTemplates(true),
  });

  const allAllocations = useMemo(
    () => [
      ...(allocationGroups ?? []).flatMap((g) =>
        g.allocations.map((a) => ({ id: a.id, name: a.name })),
      ),
      ...(miscAllocations ?? []).map((a) => ({ id: a.id, name: a.name })),
    ],
    [allocationGroups, miscAllocations],
  );

  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    const groupAllocationIds = allocationGroupId
      ? new Set(
          allocationGroups
            ?.find((g) => g.id === allocationGroupId)
            ?.allocations.map((a) => a.id) ?? [],
        )
      : null;
    return purchases.filter(
      (p) =>
        (!categoryId || p.categoryId === categoryId) &&
        (!groupAllocationIds ||
          (p.allocationId != null && groupAllocationIds.has(p.allocationId))) &&
        (!allocationId || p.allocationId === allocationId),
    );
  }, [purchases, categoryId, allocationGroupId, allocationId, allocationGroups]);

  const categoryFilterLabel =
    categories?.find((c) => c.id === categoryId)?.name ?? 'All Categories';
  const allocationGroupFilterLabel =
    allocationGroups?.find((g) => g.id === allocationGroupId)?.name ?? 'All Allocation Groups';
  const allocationFilterLabel =
    allAllocations.find((a) => a.id === allocationId)?.name ?? 'All Allocations';

  const hasActiveFilters = !!(categoryId || allocationGroupId || allocationId);

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
                <DropdownMenuItem onClick={() => setCategoryId(null)}>
                  All Categories
                </DropdownMenuItem>
                {categories && categories.length > 0 && (
                  <DropdownMenuSeparator />
                )}
                {categories?.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
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
                  <DropdownMenuItem onClick={() => setAllocationGroupId(null)}>
                    All Allocation Groups
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {allocationGroups.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onClick={() => setAllocationGroupId(g.id)}
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
                  <DropdownMenuItem onClick={() => setAllocationId(null)}>
                    All Allocations
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {allAllocations.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => setAllocationId(a.id)}
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
                onClick={() => {
                  setCategoryId(null);
                  setAllocationGroupId(null);
                  setAllocationId(null);
                }}
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
