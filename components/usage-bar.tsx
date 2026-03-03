import { cn, formatNumber } from '@/lib/utils';

import { Card } from '@/components/ui/card';

interface UsageBarProps {
  total: number;
  spent: number;
}

export function UsageBar({ total, spent }: UsageBarProps) {
  const remaining = total - spent;
  const percentUsed = total === 0 ? 0 : (spent / total) * 100;
  const percentRemaining = total === 0 ? 0 : (remaining / total) * 100;
  const isOverBudget = remaining < 0;

  return (
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
  );
}
