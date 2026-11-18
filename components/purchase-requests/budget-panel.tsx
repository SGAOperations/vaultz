import { TriangleAlert } from 'lucide-react';

import { AllocationBudget, overBudgetBy } from '@/lib/purchase-request';
import { cn, formatCurrency } from '@/lib/utils';

interface BudgetPanelProps {
  budget: AllocationBudget;
  amount: number;
  className?: string;
}

// The balance before this request, with open requests reserved: an
// allocation's, or a whole index's unallocated budget for the year.
export function BudgetPanel({ budget, amount, className }: BudgetPanelProps) {
  const over = overBudgetBy(budget, amount);
  const rows = [
    {
      label:
        budget.scope === 'index' ? 'Unallocated index budget' : 'Allocated',
      value: budget.allocated,
    },
    { label: 'Approved/spent', value: -budget.spent },
    { label: 'Other requests pending approval', value: -budget.committed },
  ];

  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border p-3', className)}>
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums">{formatCurrency(value)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t pt-2 text-sm font-semibold">
        <span>Available</span>
        <span
          className={cn(
            'tabular-nums',
            budget.remaining < 0 && 'text-destructive',
          )}
        >
          {formatCurrency(budget.remaining)}
        </span>
      </div>
      {amount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">After this request</span>
          <span className="tabular-nums">
            {formatCurrency(budget.remaining - amount)}
          </span>
        </div>
      )}
      {over > 0 && (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{`This request is ${formatCurrency(over)} over the ${budget.scope === 'index' ? "index's" : "allocation's"} available balance.`}</span>
        </div>
      )}
    </div>
  );
}
