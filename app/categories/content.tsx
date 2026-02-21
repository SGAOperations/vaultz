'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';

import { getCategoriesByDesignation } from '@/prisma/services/category';

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
    queryFn: () => getCategoriesByDesignation({ designationId }),
  });

  if (isLoading)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
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
    <div className="flex flex-col gap-2">
      {categories.map((category) => (
        <Link key={category.id} href={`/category/${category.id}`}>
          <Card className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  Code: {category.code} · Ledger: {category.ledgerCode}
                </span>
              </div>
            </div>
            <span className="text-sm font-semibold">
              $
              {category.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
