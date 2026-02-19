'use client';

import { Suspense, use, useMemo } from 'react';

import Link from 'next/link';

import { BookOpen, ChevronRight, CreditCard, Hash, Wallet } from 'lucide-react';

import { getCategoriesByDesignation } from '@/prisma/services/category';

import { useDesignation } from '@/contexts/DesignationContext';

import { CategoryWithDesignation } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CategoriesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CategoriesContent({
  promise,
  designationName,
}: {
  promise: Promise<CategoryWithDesignation[]>;
  designationName: string | undefined;
}) {
  const categories = use(promise);

  if (categories.length === 0)
    return (
      <EmptyState
        message="No categories found"
        description={
          designationName
            ? 'This designation has no spending categories yet'
            : 'Select a designation to view its categories'
        }
      />
    );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {categories.map((category) => (
        <Link
          href={`/category/${category.id}`}
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
            <div className="mt-3 flex flex-wrap gap-2">
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
                <Hash className="text-muted-foreground size-4" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Code:</span>{' '}
                  <span className="font-mono font-semibold">
                    {category.code}
                  </span>
                </span>
              </div>
              <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                <BookOpen className="text-muted-foreground size-4" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Ledger:</span>{' '}
                  <span className="font-mono font-semibold">
                    {category.ledgerCode}
                  </span>
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function CategoriesList() {
  const { activeDesignation } = useDesignation();

  const categoriesPromise = useMemo<Promise<CategoryWithDesignation[]>>(
    () =>
      activeDesignation
        ? getCategoriesByDesignation({ designationId: activeDesignation.id })
        : Promise.resolve([]),
    [activeDesignation],
  );

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Categories"
        description={
          activeDesignation
            ? `Spending categories for ${activeDesignation.name}`
            : 'Select a designation to view categories'
        }
      />
      <Suspense fallback={<CategoriesListSkeleton />}>
        <CategoriesContent
          promise={categoriesPromise}
          designationName={activeDesignation?.name}
        />
      </Suspense>
    </div>
  );
}
