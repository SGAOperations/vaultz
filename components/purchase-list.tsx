'use client';

import { useMemo, useState } from 'react';

import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import { User } from '@/prisma/client';
import { bulkUpdatePurchases } from '@/prisma/services/purchase';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  PurchaseWithUser,
} from '@/lib/types';

import { PurchaseCard } from './purchase-card';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { DatePicker } from './ui/date-picker';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type SortField = 'date' | 'amount' | 'user' | 'description';
type SortDirection = 'asc' | 'desc';

interface PurchaseListProps {
  purchases: PurchaseWithUser[];
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  initialLimit?: number;
}

export function PurchaseList({
  purchases,
  users,
  categories,
  allocationGroups,
  miscAllocations,
  initialLimit = 10,
}: PurchaseListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [filterExcluded, setFilterExcluded] = useState<boolean | null>(null);
  const [filterExpenseReport, setFilterExpenseReport] = useState<
    boolean | null
  >(null);
  const [filterReimbursed, setFilterReimbursed] = useState<boolean | null>(
    null,
  );
  const [displayLimit, setDisplayLimit] = useState(initialLimit);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = [...purchases];

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.description?.toLowerCase().includes(query) ||
          p.notes?.toLowerCase().includes(query),
      );
    }

    // Filter by user
    if (filterUserId) {
      filtered = filtered.filter((p) => p.userId === filterUserId);
    }

    // Filter by category
    if (filterCategoryId) {
      filtered = filtered.filter((p) => p.categoryId === filterCategoryId);
    }

    // Filter by date range
    if (filterDateFrom) {
      filtered = filtered.filter(
        (p) => new Date(p.purchasedAt) >= filterDateFrom,
      );
    }
    if (filterDateTo) {
      filtered = filtered.filter(
        (p) => new Date(p.purchasedAt) <= filterDateTo,
      );
    }

    // Filter by status flags
    if (filterExcluded !== null) {
      filtered = filtered.filter((p) => p.excludeFromTotal === filterExcluded);
    }
    if (filterExpenseReport !== null) {
      filtered = filtered.filter(
        (p) => p.expenseReportCreated === filterExpenseReport,
      );
    }
    if (filterReimbursed !== null) {
      filtered = filtered.filter((p) => p.reimbursed === filterReimbursed);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison =
            new Date(a.purchasedAt).getTime() -
            new Date(b.purchasedAt).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'user':
          comparison = `${a.user.first} ${a.user.last}`.localeCompare(
            `${b.user.first} ${b.user.last}`,
          );
          break;
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [
    purchases,
    searchQuery,
    sortField,
    sortDirection,
    filterUserId,
    filterCategoryId,
    filterDateFrom,
    filterDateTo,
    filterExcluded,
    filterExpenseReport,
    filterReimbursed,
  ]);

  const displayedPurchases = filteredAndSortedPurchases.slice(0, displayLimit);
  const hasMore = filteredAndSortedPurchases.length > displayLimit;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedPurchases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedPurchases.map((p) => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkUpdate = async (updates: {
    excludeFromTotal?: boolean;
    expenseReportCreated?: boolean;
    reimbursed?: boolean;
    purchasedAt?: Date;
  }) => {
    setIsUpdating(true);
    try {
      await bulkUpdatePurchases({ ids: Array.from(selectedIds), ...updates });
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to update purchases:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const activeFiltersCount =
    (filterUserId ? 1 : 0) +
    (filterCategoryId ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0) +
    (filterExcluded !== null ? 1 : 0) +
    (filterExpenseReport !== null ? 1 : 0) +
    (filterReimbursed !== null ? 1 : 0);

  const clearFilters = () => {
    setFilterUserId('');
    setFilterCategoryId('');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setFilterExcluded(null);
    setFilterExpenseReport(null);
    setFilterReimbursed(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search and Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search purchases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          {/* Sort Menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                {sortDirection === 'asc' ? (
                  <ArrowUpAZ className="size-4" />
                ) : (
                  <ArrowDownAZ className="size-4" />
                )}
                Sort
                <ChevronDown className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="flex flex-col gap-1">
                {[
                  { field: 'date' as SortField, label: 'Date' },
                  { field: 'amount' as SortField, label: 'Amount' },
                  { field: 'user' as SortField, label: 'User' },
                  { field: 'description' as SortField, label: 'Description' },
                ].map(({ field, label }) => (
                  <Button
                    key={field}
                    variant={sortField === field ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => toggleSort(field)}
                    className="justify-start"
                  >
                    {label}
                    {sortField === field && (
                      <Check className="ml-auto size-4" />
                    )}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Filter Menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="size-4" />
                Filter
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-auto p-1 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* User Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">User</label>
                  <select
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none"
                  >
                    <option value="">All users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first} {user.last}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none"
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex flex-col gap-2">
                    <DatePicker
                      value={filterDateFrom}
                      onChange={setFilterDateFrom}
                    />
                    <DatePicker
                      value={filterDateTo}
                      onChange={setFilterDateTo}
                    />
                  </div>
                </div>

                {/* Status Filters */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filterExcluded === true}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFilterExcluded(e.target.checked ? true : null)
                      }
                    />
                    <span className="text-sm">Excluded from total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filterExpenseReport === true}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFilterExpenseReport(e.target.checked ? true : null)
                      }
                    />
                    <span className="text-sm">Expense report created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filterReimbursed === true}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFilterReimbursed(e.target.checked ? true : null)
                      }
                    />
                    <span className="text-sm">Reimbursed</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Selection Header */}
      {purchases.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={
              displayedPurchases.length > 0 &&
              selectedIds.size === displayedPurchases.length
            }
            onChange={() => toggleSelectAll()}
          />
          <span className="text-muted-foreground text-sm">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : 'Select all'}
          </span>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="bg-accent/50 border-primary/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              {selectedIds.size} purchase{selectedIds.size !== 1 ? 's' : ''}{' '}
              selected
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkUpdate({ excludeFromTotal: true })}
                disabled={isUpdating}
              >
                {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Mark Excluded
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkUpdate({ expenseReportCreated: true })}
                disabled={isUpdating}
              >
                {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Mark Report Filed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkUpdate({ reimbursed: true })}
                disabled={isUpdating}
              >
                {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Mark Reimbursed
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    <CalendarIcon className="mr-2 size-4" />
                    Update Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <DatePicker
                    value={undefined}
                    onChange={(date) => {
                      if (date) {
                        handleBulkUpdate({ purchasedAt: date });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={isUpdating}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Purchase List */}
      {displayedPurchases.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No purchases found</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedPurchases.map((purchase) => (
            <div key={purchase.id} className="flex items-start gap-2">
              <div className="pt-4">
                <Checkbox
                  checked={selectedIds.has(purchase.id)}
                  onChange={() => toggleSelection(purchase.id)}
                />
              </div>
              <div className="flex-1">
                <PurchaseCard
                  purchase={purchase}
                  users={users}
                  categories={categories}
                  allocationGroups={allocationGroups}
                  miscAllocations={miscAllocations}
                  stopPropagation={true}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredAndSortedPurchases.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {displayedPurchases.length} of{' '}
            {filteredAndSortedPurchases.length} purchase
            {filteredAndSortedPurchases.length !== 1 ? 's' : ''}
          </p>
          {hasMore && (
            <Button
              variant="outline"
              onClick={() => setDisplayLimit(displayLimit + initialLimit)}
            >
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
