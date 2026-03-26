'use client';

import { useMemo } from 'react';

import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Layers,
  Tag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useQueryState } from 'nuqs';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getCategoriesWithAvailableAmount } from '@/prisma/services/category';
import { getPeriodsForYear } from '@/prisma/services/period';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getPurchasesByDesignation } from '@/prisma/services/purchase';
import { getUsers } from '@/prisma/services/user';

import { cn, parseDateOnly } from '@/lib/utils';

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
  DropdownMenuGroup,
  DropdownMenuLabel,
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

function formatDateLabel(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function Content({ designationId, designationName }: ContentProps) {
  const { selectedYear } = useYear();

  const [categoryId, setCategoryId] = useQueryState('category');
  const [allocationGroupId, setAllocationGroupId] =
    useQueryState('allocationGroup');
  const [allocationId, setAllocationId] = useQueryState('allocation');
  const [dateFrom, setDateFrom] = useQueryState('dateFrom');
  const [dateTo, setDateTo] = useQueryState('dateTo');
  const [userId, setUserId] = useQueryState('user');
  const [periodId, setPeriodId] = useQueryState('period');
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

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
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

  const miscAllocationIds = useMemo(
    () => new Set((miscAllocations ?? []).map((a) => a.id)),
    [miscAllocations],
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
    return purchases.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;

      if (allocationGroupId === 'none') {
        if (p.allocationId !== null && !miscAllocationIds.has(p.allocationId))
          return false;
      } else if (allocationGroupId) {
        const groupAllocationIds = new Set(
          allocationGroups
            ?.find((g) => g.id === allocationGroupId)
            ?.allocations.map((a) => a.id) ?? [],
        );
        if (p.allocationId === null || !groupAllocationIds.has(p.allocationId))
          return false;
      }

      if (allocationId === 'none') {
        if (p.allocationId !== null) return false;
      } else if (allocationId && p.allocationId !== allocationId) {
        return false;
      }

      if (userId && p.userId !== userId) return false;

      if (dateFrom || dateTo) {
        const purchaseDate = parseDateOnly(p.purchasedAt);
        if (dateFrom && purchaseDate < new Date(dateFrom)) return false;
        if (dateTo && purchaseDate > new Date(dateTo)) return false;
      }

      if (periodId === 'none') {
        const purchasedAt = new Date(p.purchasedAt);
        const inAnyPeriod = (periods ?? []).some(
          (period) =>
            purchasedAt >= new Date(period.startDate) &&
            purchasedAt <= new Date(period.endDate),
        );
        if (inAnyPeriod) return false;
      } else if (periodId) {
        const period = (periods ?? []).find((p) => p.id === periodId);
        if (!period) return false;
        const purchasedAt = new Date(p.purchasedAt);
        if (
          purchasedAt < new Date(period.startDate) ||
          purchasedAt > new Date(period.endDate)
        )
          return false;
      }

      return true;
    });
  }, [
    purchases,
    categoryId,
    allocationGroupId,
    allocationId,
    userId,
    periodId,
    periods,
    allocationGroups,
    dateFrom,
    dateTo,
    miscAllocationIds,
  ]);

  const categoryFilterLabel =
    categories?.find((c) => c.id === categoryId)?.name ?? 'All Categories';
  const allocationGroupFilterLabel =
    allocationGroupId === 'none'
      ? 'No Allocation Group'
      : (allocationGroups?.find((g) => g.id === allocationGroupId)?.name ??
        'All Allocation Groups');
  const allocationFilterLabel =
    allocationId === 'none'
      ? 'No Allocation'
      : (allAllocations.find((a) => a.id === allocationId)?.name ??
        'All Allocations');
  const selectedUser = users?.find((u) => u.id === userId);
  const userFilterLabel = selectedUser
    ? `${selectedUser.first} ${selectedUser.last}`
    : 'All Users';

  const periodFilterLabel =
    periodId === 'none'
      ? 'No Period'
      : ((periods ?? []).find((p) => p.id === periodId)?.name ?? 'All Periods');
  const hasDateRangeSelection = !!(dateFrom || dateTo);
  const hasActiveFilters = !!(
    categoryId ||
    allocationGroupId ||
    allocationId ||
    dateFrom ||
    dateTo ||
    userId ||
    periodId
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
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={allocationGroupId === 'none'}
                    onClick={() => setAllocationGroupId('none')}
                  >
                    No Allocation Group
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
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={allocationId === 'none'}
                    onClick={() => setAllocationId('none')}
                  >
                    No Allocation
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={userId ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 rounded-full"
                >
                  <User className="size-3.5" />
                  {userFilterLabel}
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                  checked={!userId}
                  onClick={() => setUserId(null)}
                >
                  All Users
                </DropdownMenuCheckboxItem>
                {users && users.length > 0 && <DropdownMenuSeparator />}
                {users?.map((u) => (
                  <DropdownMenuCheckboxItem
                    key={u.id}
                    checked={userId === u.id}
                    onClick={() => setUserId(u.id)}
                  >
                    {u.first} {u.last}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {(periodsLoading || (periods && periods.length > 0)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={periodId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 rounded-full"
                    disabled={periodsLoading}
                  >
                    <CalendarDays className="size-3.5" />
                    {periodFilterLabel}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={!periodId}
                    onClick={() => setPeriodId(null)}
                  >
                    All Periods
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={periodId === 'none'}
                    onClick={() => setPeriodId('none')}
                  >
                    No Period
                  </DropdownMenuCheckboxItem>
                  {periods && periods.length > 0 && <DropdownMenuSeparator />}
                  {periods?.map((p) => (
                    <DropdownMenuCheckboxItem
                      key={p.id}
                      checked={periodId === p.id}
                      onClick={() => setPeriodId(p.id)}
                    >
                      {p.name}
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
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <span className="truncate">
                      {formatDateLabel(dateFrom)}
                    </span>
                    {hasDateRangeSelection ? '-' : 'Date Range'}
                    <span className="truncate">{formatDateLabel(dateTo)}</span>
                  </span>
                  <ChevronDown className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[22rem] p-3">
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-3">
                  <span className="text-muted-foreground text-xs font-medium">
                    From
                  </span>
                  <div className="min-w-0">
                    <DatePicker
                      value={dateFrom ? new Date(dateFrom) : undefined}
                      onChange={(d) =>
                        setDateFrom(d.toISOString().split('T')[0])
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear from date"
                    className={cn(
                      'size-8 shrink-0',
                      !dateFrom && 'pointer-events-none invisible',
                    )}
                    onClick={() => setDateFrom(null)}
                  >
                    <X className="size-3.5" />
                  </Button>

                  <span className="text-muted-foreground text-xs font-medium">
                    To
                  </span>
                  <div className="min-w-0">
                    <DatePicker
                      value={dateTo ? new Date(dateTo) : undefined}
                      onChange={(d) => setDateTo(d.toISOString().split('T')[0])}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear to date"
                    className={cn(
                      'size-8 shrink-0',
                      !dateTo && 'pointer-events-none invisible',
                    )}
                    onClick={() => setDateTo(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
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
                  setUserId(null);
                  setPeriodId(null);
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
