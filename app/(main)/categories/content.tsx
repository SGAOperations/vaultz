'use client';

import Link from 'next/link';

import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Hash,
  Pencil,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { getCategoriesWithBudgetForYear } from '@/prisma/services/category-year';

import { cn, formatNumber } from '@/lib/utils';

import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const { selectedYear } = useYear();

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['categories-budget', designationId, selectedYear?.id],
    queryFn: () =>
      selectedYear
        ? getCategoriesWithBudgetForYear({
            designationId,
            yearId: selectedYear.id,
          })
        : Promise.resolve([]),
    enabled: !!selectedYear,
  });

  if (!selectedYear)
    return (
      <EmptyState
        message="No fiscal year selected"
        description="Add a fiscal year in the Periods section to view budgets"
      />
    );

  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );

  if (isError) return <EmptyState message="Failed to load categories" />;

  if (!categories || categories.length === 0)
    return (
      <EmptyState
        message="No categories yet"
        description="Create categories for this designation to see them here"
      />
    );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {categories.map((category) => {
        const { budget, spent, available } = category;
        const hasBudget = category.categoryYearId !== null;

        return (
          <div key={category.id} className="group relative h-full">
            <Link
              href={`/purchases?category=${category.id}`}
              className="h-full"
            >
              <Card
                className={cn(
                  'hover:border-primary/30 h-full p-4 transition-all duration-200 hover:shadow-md',
                  !hasBudget && 'border-dashed opacity-75',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <CreditCard className="text-primary size-5" />
                    </div>
                    <div>
                      <h3 className="group-hover:text-primary font-semibold transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-muted-foreground font-mono text-sm">
                        SC{category.code}
                      </p>
                    </div>
                  </div>
                  <div className="size-8" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                    <Hash className="text-muted-foreground size-4" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Ledger:</span>{' '}
                      <span className="font-mono font-semibold">
                        {category.ledgerCode}
                      </span>
                    </span>
                  </div>
                  {hasBudget ? (
                    <>
                      <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                        <Wallet className="text-stat-total size-4" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Budget:</span>{' '}
                          <span className="font-semibold">
                            ${formatNumber(budget)}
                          </span>
                        </span>
                      </div>
                      <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                        <TrendingDown className="text-stat-spent size-4" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Spent:</span>{' '}
                          <span className="font-semibold">
                            ${formatNumber(spent)}
                          </span>
                        </span>
                      </div>
                      <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                        <TrendingUp className="text-stat-remaining size-4" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">
                            Available:
                          </span>{' '}
                          <span
                            className={cn(
                              'font-semibold',
                              available < 0 && 'text-destructive',
                            )}
                          >
                            ${formatNumber(available)}
                          </span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                      <span className="text-muted-foreground text-sm">
                        No budget set for {selectedYear.name}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
            <div
              className="absolute top-3 right-3"
              onClick={(e) => e.preventDefault()}
            >
              <EditCategoryDialog
                category={category}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
