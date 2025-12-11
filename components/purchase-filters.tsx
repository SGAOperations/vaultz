'use client';

import { User } from '@/prisma/client';

import { CategoryWithDesignation } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';

export interface PurchaseFilters {
  userId: string;
  categoryId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  excluded: boolean | null;
  expenseReport: boolean | null;
  reimbursed: boolean | null;
}

interface PurchaseFiltersFormProps {
  filters: PurchaseFilters;
  users: User[];
  categories: CategoryWithDesignation[];
  onFilterChange: (filters: Partial<PurchaseFilters>) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export function PurchaseFiltersForm({
  filters,
  users,
  categories,
  onFilterChange,
  onClearFilters,
  activeFiltersCount,
}: PurchaseFiltersFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Filters</h4>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
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
          value={filters.userId}
          onChange={(e) => onFilterChange({ userId: e.target.value })}
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
          value={filters.categoryId}
          onChange={(e) => onFilterChange({ categoryId: e.target.value })}
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
            value={filters.dateFrom}
            onChange={(date) => onFilterChange({ dateFrom: date })}
          />
          <DatePicker
            value={filters.dateTo}
            onChange={(date) => onFilterChange({ dateTo: date })}
          />
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Status</label>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filters.excluded === true}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onFilterChange({ excluded: e.target.checked ? true : null })
            }
          />
          <span className="text-sm">Excluded from total</span>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filters.expenseReport === true}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onFilterChange({ expenseReport: e.target.checked ? true : null })
            }
          />
          <span className="text-sm">Expense report created</span>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filters.reimbursed === true}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onFilterChange({ reimbursed: e.target.checked ? true : null })
            }
          />
          <span className="text-sm">Reimbursed</span>
        </div>
      </div>
    </div>
  );
}
