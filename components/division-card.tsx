import { FileWarning, Receipt } from 'lucide-react';

import { DivisionFigures } from '@/lib/types';
import { cn, formatNumber } from '@/lib/utils';

import { Card } from '@/components/ui/card';

interface DivisionCardProps {
  division: DivisionFigures;
}

export function DivisionCard({ division }: DivisionCardProps) {
  const {
    name,
    allocatedTotal,
    spentTotal,
    remaining,
    notReimbursedCount,
    noExpenseReportCount,
  } = division;
  const percentUsed =
    allocatedTotal === 0 ? 0 : (spentTotal / allocatedTotal) * 100;
  const isOverBudget = remaining < 0;

  return (
    <Card className="flex min-w-0 flex-col gap-4 p-4">
      <h3 className="truncate font-semibold tracking-tight" title={name}>
        {name}
      </h3>

      <dl className="flex flex-col gap-1.5 text-sm">
        <FigureRow label="Allocated" value={allocatedTotal} />
        <FigureRow label="Spent" value={spentTotal} />
        <FigureRow
          label="Remaining"
          value={remaining}
          className={cn(isOverBudget && 'text-destructive')}
        />
      </dl>

      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="meter"
        aria-label={`${name} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(percentUsed, 100))}
      >
        <div
          className={cn(
            'h-full rounded-full',
            isOverBudget ? 'bg-destructive' : 'bg-stat-spent',
          )}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <Receipt className="size-3.5" aria-hidden="true" />
          {notReimbursedCount} not reimbursed
        </span>
        <span className="flex items-center gap-1">
          <FileWarning className="size-3.5" aria-hidden="true" />
          {noExpenseReportCount} without expense report
        </span>
      </div>
    </Card>
  );
}

function FigureRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium tabular-nums', className)}>
        ${formatNumber(value)}
      </dd>
    </div>
  );
}
