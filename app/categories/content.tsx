'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  CreditCard,
  Hash,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { getCategoriesWithPurchasesByDesignation } from '@/prisma/services/category';

import { cn, formatNumber } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['categories', designationId],
    queryFn: () =>
      getCategoriesWithPurchasesByDesignation({ designationId }),
  });

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
        const spent = category.purchases
          .filter((p) => !p.excludeFromTotal)
          .reduce((acc, p) => acc + p.amount, 0);
        const remaining = category.amount - spent;

        return (
          <Link
            href={`/categories/${category.id}`}
            key={category.id}
            className="group"
          >
            <Card className="hover:border-primary/30 p-4 transition-all duration-200 hover:shadow-md">
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
                <ChevronRight className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
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
                <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                  <Wallet className="text-stat-total size-4" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Budget:</span>{' '}
                    <span className="font-semibold">
                      ${formatNumber(category.amount)}
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
                    <span className="text-muted-foreground">Left:</span>{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        remaining < 0 && 'text-destructive',
                      )}
                    >
                      ${formatNumber(remaining)}
                    </span>
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
