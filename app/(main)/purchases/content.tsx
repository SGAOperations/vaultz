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
import { getPeriodsForYear } from '@/prisma/services/period';
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
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
  const [allocationGroupId, setAllocationGroupId] =
    useQueryState('allocationGroup');
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

  const { data: allocationGroups, isLoading: allocationGroupsLoading } =
    useQuery({
      queryKey: ['allocation-groups', designationId, selectedYear?.id],
      queryFn: () =>
        getAllAllocationGroups(designationId, undefined, selectedYear?.id),
    });

  const { data: miscAllocations, isLoading: miscAllocationsLoading } = useQuery(
    {
      queryKey: ['misc-allocations', designationId, selectedYear?.id],
      queryFn: () =>
        getMiscAllocations(designationId, undefined, selectedYear?.id),
    },
  );

  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ['periods', selectedYear?.id],
    queryFn: () =>
      selectedYear
        ? getPeriodsForYear(selectedYear.id, true)
        : Promise.resolve([]),
    enabled: !!selectedYear,
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

  const groupedAllocations = useMemo(() => {
    if (!periods || !allocationGroups || !miscAllocations) return [];

    return periods
      .map((period) => {
        const groups = allocationGroups
          .map((group) => ({
            ...group,
            allocations: group.allocations.filter(
              (a) => a.periodId === period.id,
            ),
          }))
          .filter((group) => group.allocations.length > 0);

        const misc = miscAllocations.filter((a) => a.periodId === period.id);

        return { period, groups, misc };
      })
      .filter(({ groups, misc }) => groups.length > 0 || misc.length > 0);
  }, [periods, allocationGroups, miscAllocations]);

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
  }, [
    purchases,
    categoryId,
    allocationGroupId,
    allocationId,
    allocationGroups,
  ]);

  const categoryFilterLabel =
    categories?.find((c) => c.id === categoryId)?.name ?? 'All Categories';
  const allocationGroupFilterLabel =
    allocationGroups?.find((g) => g.id === allocationGroupId)?.name ??
    'All Allocation Groups';
  const allocationFilterLabel =
    allAllocations.find((a) => a.id === allocationId)?.name ??
    'All Allocations';

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
          <CreatePurchaseDialog defaultCategoryId={categoryId ?? undefined} />
        }
      />

      {!selectedYear ? (
        <EmptyState
          message="No fiscal year selected"
          description="Add a fiscal year in the Periods section to view purchases"
        />
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
                <DropdownMenuCheckboxItem
                  checked={!categoryId}
                  onClick={() => setCategoryId(null)}
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                {categories && categories.length > 0 && (
                  <DropdownMenuSeparator />
                )}
                {categories?.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={categoryId === c.id}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {c.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {(allocationGroupsLoading ||
              (allocationGroups && allocationGroups.length > 0)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={allocationGroupId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 rounded-full"
                    disabled={allocationGroupsLoading}
                  >
                    <Layers className="size-3.5" />
                    {allocationGroupFilterLabel}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={!allocationGroupId}
                    onClick={() => setAllocationGroupId(null)}
                  >
                    All Allocation Groups
                  </DropdownMenuCheckboxItem>
                  {allocationGroups && allocationGroups.length > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  {allocationGroups?.map((g) => (
                    <DropdownMenuCheckboxItem
                      key={g.id}
                      checked={allocationGroupId === g.id}
                      onClick={() => setAllocationGroupId(g.id)}
                    >
                      {g.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {(allocationGroupsLoading ||
              miscAllocationsLoading ||
              periodsLoading ||
              allAllocations.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={allocationId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 rounded-full"
                    disabled={
                      miscAllocationsLoading ||
                      allocationGroupsLoading ||
                      periodsLoading
                    }
                  >
                    <Wallet className="size-3.5" />
                    {allocationFilterLabel}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={!allocationId}
                    onClick={() => setAllocationId(null)}
                  >
                    All Allocations
                  </DropdownMenuCheckboxItem>
                  {groupedAllocations.length > 0 && <DropdownMenuSeparator />}
                  {groupedAllocations.map(
                    ({ period, groups, misc }, periodIdx) => (
                      <DropdownMenuGroup key={period.id}>
                        {periodIdx > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-muted-foreground text-xs font-semibold">
                          {period.name}
                        </DropdownMenuLabel>
                        {groups.map((group) => (
                          <DropdownMenuGroup key={group.id}>
                            <DropdownMenuLabel className="text-muted-foreground pl-4 text-xs font-medium">
                              {group.name}
                            </DropdownMenuLabel>
                            {group.allocations.map((a) => (
                              <DropdownMenuCheckboxItem
                                key={a.id}
                                checked={allocationId === a.id}
                                onClick={() => setAllocationId(a.id)}
                              >
                                {a.name}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuGroup>
                        ))}
                        {misc.length > 0 && (
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-muted-foreground pl-4 text-xs font-medium">
                              Miscellaneous
                            </DropdownMenuLabel>
                            {misc.map((a) => (
                              <DropdownMenuCheckboxItem
                                key={a.id}
                                checked={allocationId === a.id}
                                onClick={() => setAllocationId(a.id)}
                              >
                                {a.name}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuGroup>
                        )}
                      </DropdownMenuGroup>
                    ),
                  )}
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

          {purchasesLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
