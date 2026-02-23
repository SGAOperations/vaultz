import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { AllocationGroupWithAllocations } from '@/lib/types';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

import { Card } from '@/components/ui/card';

interface AllocationGroupsSummaryProps {
  allocationGroups: AllocationGroupWithAllocations[];
}

export function AllocationGroupsSummary({
  allocationGroups,
}: AllocationGroupsSummaryProps) {
  const allAllocations = allocationGroups.flatMap((g) => g.allocations);
  const allPurchases = allAllocations.flatMap((a) => a.purchases);

  const totalAllocated = allAllocations.reduce((acc, a) => acc + a.amount, 0);
  const totalSpent = allPurchases
    .filter((p) => !p.excludeFromTotal)
    .reduce((acc, p) => acc + p.amount, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const percentUsed =
    totalAllocated === 0 ? 0 : (totalSpent / totalAllocated) * 100;
  const percentRemaining =
    totalAllocated === 0 ? 0 : (totalRemaining / totalAllocated) * 100;
  const isOverBudget = totalRemaining < 0;

  return (
    <Card className="mb-6 p-6">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Total Allocated
            </p>
            <div className="flex items-center gap-2">
              <div className="bg-stat-total/10 rounded-lg p-2">
                <Wallet className="text-stat-total size-5" />
              </div>
              <p className="text-stat-total text-3xl font-bold tracking-tight">
                {formatCurrency(totalAllocated)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Total Spent
            </p>
            <div className="flex items-center gap-2">
              <div className="bg-stat-spent/10 rounded-lg p-2">
                <TrendingDown className="text-stat-spent size-5" />
              </div>
              <p className="text-stat-spent text-3xl font-bold tracking-tight">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Total Remaining
            </p>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'rounded-lg p-2',
                  isOverBudget
                    ? 'bg-destructive/10'
                    : 'bg-stat-remaining/10',
                )}
              >
                <TrendingUp
                  className={cn(
                    'size-5',
                    isOverBudget ? 'text-destructive' : 'text-stat-remaining',
                  )}
                />
              </div>
              <p
                className={cn(
                  'text-3xl font-bold tracking-tight',
                  isOverBudget ? 'text-destructive' : 'text-stat-remaining',
                )}
              >
                {formatCurrency(totalRemaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              <span
                className={cn(
                  'font-semibold',
                  isOverBudget ? 'text-destructive' : 'text-stat-spent',
                )}
              >
                {formatNumber(percentUsed)}%
              </span>{' '}
              used
            </span>
            <span className="text-muted-foreground">
              <span
                className={cn(
                  'font-semibold',
                  isOverBudget ? 'text-destructive' : 'text-stat-remaining',
                )}
              >
                {formatNumber(Math.max(percentRemaining, 0))}%
              </span>{' '}
              remaining
            </span>
          </div>
          <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isOverBudget ? 'bg-destructive' : 'bg-stat-spent',
              )}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
