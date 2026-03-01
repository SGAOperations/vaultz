'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { getCategoryBudgetsAcrossYears } from '@/prisma/services/category-year';

import { cn, formatCurrency } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryYearComparisonProps {
  designationId: string;
}

export function CategoryYearComparison({
  designationId,
}: CategoryYearComparisonProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['category-budgets-across-years', designationId],
    queryFn: () => getCategoryBudgetsAcrossYears({ designationId }),
  });

  if (isLoading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );

  if (isError)
    return <EmptyState message="Failed to load year comparison data" />;

  if (!data || data.years.length === 0)
    return (
      <EmptyState
        message="No fiscal years found"
        description="Add fiscal years in the Periods section to see comparisons"
      />
    );

  if (data.categories.length === 0)
    return (
      <EmptyState
        message="No categories found"
        description="Create categories for this designation to see budget comparisons"
      />
    );

  const { categories, years } = data;

  return (
    <div className="overflow-x-auto">
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                Category
              </th>
              {years.map((year) => (
                <th
                  key={year.id}
                  className="text-muted-foreground px-4 py-3 text-right font-medium"
                >
                  {year.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr
                key={category.id}
                className="hover:bg-muted/30 border-b last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">
                    SC{category.code}
                  </div>
                </td>
                {category.yearBudgets.map((yb, idx) => {
                  const prevBudget =
                    idx > 0 ? category.yearBudgets[idx - 1].amount : null;
                  const change =
                    prevBudget !== null && prevBudget > 0
                      ? ((yb.amount - prevBudget) / prevBudget) * 100
                      : null;

                  return (
                    <td key={yb.yearId} className="px-4 py-3 text-right">
                      {yb.amount > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold">
                            {formatCurrency(yb.amount)}
                          </span>
                          {change !== null && <ChangeIndicator pct={change} />}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="px-4 py-3 font-semibold">Total</td>
              {years.map((year, idx) => {
                const total = categories.reduce((acc, cat) => {
                  const yb = cat.yearBudgets.find(
                    (yb) => yb.yearId === year.id,
                  );
                  return acc + (yb?.amount ?? 0);
                }, 0);
                const prevTotal =
                  idx > 0
                    ? categories.reduce((acc, cat) => {
                        const yb = cat.yearBudgets.find(
                          (yb) => yb.yearId === years[idx - 1].id,
                        );
                        return acc + (yb?.amount ?? 0);
                      }, 0)
                    : null;
                const change =
                  prevTotal !== null && prevTotal > 0
                    ? ((total - prevTotal) / prevTotal) * 100
                    : null;
                return (
                  <td key={year.id} className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold">
                        {formatCurrency(total)}
                      </span>
                      {change !== null && <ChangeIndicator pct={change} />}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

function ChangeIndicator({ pct }: { pct: number }) {
  const rounded = Math.round(pct * 10) / 10;
  const isIncrease = rounded > 0;
  const isDecrease = rounded < 0;

  return (
    <span
      className={cn(
        'flex items-center gap-0.5 text-xs',
        isIncrease && 'text-green-600 dark:text-green-400',
        isDecrease && 'text-destructive',
        !isIncrease && !isDecrease && 'text-muted-foreground',
      )}
    >
      {isIncrease && <ArrowUp className="size-3" />}
      {isDecrease && <ArrowDown className="size-3" />}
      {!isIncrease && !isDecrease && <Minus className="size-3" />}
      {Math.abs(rounded)}%
    </span>
  );
}
