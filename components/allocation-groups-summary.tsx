import { AllocationGroupWithAllocations } from '@/lib/types';
import { cn, formatNumber } from '@/lib/utils';

import { StatCards } from '@/components/stat-card';
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
    <div className="mb-2 flex flex-col gap-3">
      <StatCards
        total={totalAllocated}
        spent={totalSpent}
        remaining={totalRemaining}
      />
      <Card className="p-4">
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
      </Card>
    </div>
  );
}
