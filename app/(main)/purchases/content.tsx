'use client';

import { useMemo } from 'react';

import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { CalendarRange, ChevronDown, Layers, Tag, Wallet, X } from 'lucide-react';
import { useQueryState } from 'nuqs';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getCategoriesWithAvailableAmount } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getPurchasesByDesignation } from '@/prisma/services/purchase';

import { parseDateOnly } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [dateFrom, setDateFrom] = useQueryState('dateFrom');
  const [dateTo, setDateTo] = useQueryState('dateTo');
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
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    return purchases.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (
        groupAllocationIds &&
        (p.allocationId == null || !groupAllocationIds.has(p.allocationId))
      )
        return false;
      if (allocationId && p.allocationId !== allocationId) return false;
      if (fromDate || toDate) {
        const purchaseDate = parseDateOnly(p.purchasedAt);
        if (fromDate && purchaseDate < fromDate) return false;
        if (toDate && purchaseDate > toDate) return false;
      }
      return true;
    });
  }, [
    purchases,
    categoryId,
    allocationGroupId,
    allocationId,
    allocationGroups,
    dateFrom,
    dateTo,
  ]);

  const categoryFilterLabel =
    categories?.find((c) => c.id === categoryId)?.name ?? 'All Categories';
  const allocationGroupFilterLabel =
    allocationGroups?.find((g) => g.id === allocationGroupId)?.name ??
    'All Allocation Groups';
  const allocationFilterLabel =
    allAllocations.find((a) => a.id === allocationId)?.name ??
    'All Allocations';

  const hasActiveFilters = !!(
    categoryId ||
    allocationGroupId ||
    allocationId ||
    dateFrom ||
    dateTo
  );

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
              allAllocations.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={allocationId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 rounded-full"
                    disabled={miscAllocationsLoading || allocationGroupsLoading}
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
                  {allAllocations.length > 0 && <DropdownMenuSeparator />}
                  {allAllocations.map((a) => (
                    <DropdownMenuCheckboxItem
                      key={a.id}
                      checked={allocationId === a.id}
                      onClick={() => setAllocationId(a.id)}
                    >
                      {a.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={dateFrom || dateTo ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 rounded-full"
                >
                  <CalendarRange className="size-3.5" />
                  {dateFrom || dateTo
                    ? [dateFrom, dateTo]
                        .map((d) =>
                          d
                            ? new Date(d).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '…',
                        )
                        .join(' – ')
                    : 'Date Range'}
                  <ChevronDown className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">
                      From
                    </span>
                    <div className="flex items-center gap-1.5">
                      <DatePicker
                        value={dateFrom ? new Date(dateFrom) : undefined}
                        onChange={(d) =>
                          setDateFrom(d.toISOString().split('T')[0])
                        }
                      />
                      {dateFrom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Clear from date"
                          className="size-8 shrink-0"
                          onClick={() => setDateFrom(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">
                      To
                    </span>
                    <div className="flex items-center gap-1.5">
                      <DatePicker
                        value={dateTo ? new Date(dateTo) : undefined}
                        onChange={(d) =>
                          setDateTo(d.toISOString().split('T')[0])
                        }
                      />
                      {dateTo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Clear to date"
                          className="size-8 shrink-0"
                          onClick={() => setDateTo(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 rounded-full"
                onClick={() => {
                  setCategoryId(null);
                  setAllocationGroupId(null);
                  setAllocationId(null);
                  setDateFrom(null);
                  setDateTo(null);
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
