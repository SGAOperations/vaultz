'use client';

import { useMemo, useState } from 'react';

import { search } from 'fast-fuzzy';
import {
  AlertCircle,
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

import { PurchaseCard } from '@/components/purchase-card';
import {
  PurchaseFilters,
  PurchaseFiltersForm,
} from '@/components/purchase-filters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const [filters, setFilters] = useState<PurchaseFilters>({
    userId: '',
    categoryId: '',
    dateFrom: undefined,
    dateTo: undefined,
    excluded: null,
    expenseReport: null,
    reimbursed: null,
  });
  const [displayLimit, setDisplayLimit] = useState(initialLimit);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    excludeFromTotal?: boolean;
    expenseReportCreated?: boolean;
    reimbursed?: boolean;
    purchasedAt?: Date;
  } | null>(null);

  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = [...purchases];

    // Fuzzy text search across all searchable fields
    if (searchQuery) {
      // Build searchable strings for each purchase
      const searchableItems = purchases.map((p) => ({
        purchase: p,
        searchText: [
          p.description || '',
          p.notes || '',
          `${p.user.first} ${p.user.last}`,
          p.amount.toString(),
          categories.find((c) => c.id === p.categoryId)?.name || '',
        ]
          .join(' ')
          .toLowerCase(),
      }));

      // Use fast-fuzzy search with scoring
      const results = search(searchQuery, searchableItems, {
        keySelector: (item) => item.searchText,
        threshold: 0.3, // Allow some tolerance for typos
      });

      filtered = results.map((item) => item.purchase);
    }

    // Filter by user
    if (filters.userId) {
      filtered = filtered.filter((p) => p.userId === filters.userId);
    }

    // Filter by category
    if (filters.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (p) => new Date(p.purchasedAt) >= filters.dateFrom!,
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (p) => new Date(p.purchasedAt) <= filters.dateTo!,
      );
    }

    // Filter by status flags
    if (filters.excluded !== null) {
      filtered = filtered.filter(
        (p) => p.excludeFromTotal === filters.excluded,
      );
    }
    if (filters.expenseReport !== null) {
      filtered = filtered.filter(
        (p) => p.expenseReportCreated === filters.expenseReport,
      );
    }
    if (filters.reimbursed !== null) {
      filtered = filtered.filter((p) => p.reimbursed === filters.reimbursed);
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
  }, [purchases, searchQuery, sortField, sortDirection, filters, categories]);

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

  const requestBulkUpdate = (updates: {
    excludeFromTotal?: boolean;
    expenseReportCreated?: boolean;
    reimbursed?: boolean;
    purchasedAt?: Date;
  }) => {
    setPendingUpdate(updates);
    setConfirmDialogOpen(true);
  };

  const handleBulkUpdate = async () => {
    if (!pendingUpdate) return;

    setIsUpdating(true);
    setConfirmDialogOpen(false);
    try {
      await bulkUpdatePurchases({
        ids: Array.from(selectedIds),
        ...pendingUpdate,
      });
      setSelectedIds(new Set());
      setPendingUpdate(null);
    } catch (error) {
      console.error('Failed to update purchases:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelBulkUpdate = () => {
    setConfirmDialogOpen(false);
    setPendingUpdate(null);
  };

  const activeFiltersCount =
    (filters.userId ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.excluded !== null ? 1 : 0) +
    (filters.expenseReport !== null ? 1 : 0) +
    (filters.reimbursed !== null ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      userId: '',
      categoryId: '',
      dateFrom: undefined,
      dateTo: undefined,
      excluded: null,
      expenseReport: null,
      reimbursed: null,
    });
  };

  const handleFilterChange = (updates: Partial<PurchaseFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
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
              <PurchaseFiltersForm
                filters={filters}
                users={users}
                categories={categories}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                activeFiltersCount={activeFiltersCount}
              />
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
              {/* Exclude from Total Actions */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    Exclude
                    <ChevronDown className="ml-2 size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        requestBulkUpdate({ excludeFromTotal: true })
                      }
                      className="justify-start"
                    >
                      Mark as Excluded
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        requestBulkUpdate({ excludeFromTotal: false })
                      }
                      className="justify-start"
                    >
                      Mark as Included
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Expense Report Actions */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    Report
                    <ChevronDown className="ml-2 size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        requestBulkUpdate({ expenseReportCreated: true })
                      }
                      className="justify-start"
                    >
                      Mark Report Filed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        requestBulkUpdate({ expenseReportCreated: false })
                      }
                      className="justify-start"
                    >
                      Mark Report Not Filed
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Reimbursed Actions */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    Reimburse
                    <ChevronDown className="ml-2 size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestBulkUpdate({ reimbursed: true })}
                      className="justify-start"
                    >
                      Mark as Reimbursed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestBulkUpdate({ reimbursed: false })}
                      className="justify-start"
                    >
                      Mark as Not Reimbursed
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

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
                        requestBulkUpdate({ purchasedAt: date });
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Update</DialogTitle>
            <DialogDescription>
              You are about to update {selectedIds.size} purchase
              {selectedIds.size !== 1 ? 's' : ''}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-primary mt-0.5 size-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Update Details:</p>
                <ul className="text-muted-foreground list-inside list-disc text-sm">
                  {pendingUpdate?.excludeFromTotal !== undefined && (
                    <li>
                      {pendingUpdate.excludeFromTotal ? 'Mark' : 'Unmark'} as
                      excluded from total
                    </li>
                  )}
                  {pendingUpdate?.expenseReportCreated !== undefined && (
                    <li>
                      {pendingUpdate.expenseReportCreated ? 'Mark' : 'Unmark'}{' '}
                      expense report as created
                    </li>
                  )}
                  {pendingUpdate?.reimbursed !== undefined && (
                    <li>
                      {pendingUpdate.reimbursed ? 'Mark' : 'Unmark'} as
                      reimbursed
                    </li>
                  )}
                  {pendingUpdate?.purchasedAt && (
                    <li>
                      Update purchase date to{' '}
                      {pendingUpdate.purchasedAt.toLocaleDateString()}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelBulkUpdate}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
