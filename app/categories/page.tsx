'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  BookOpen,
  ChevronRight,
  CreditCard,
  Hash,
  Loader2,
  Wallet,
} from 'lucide-react';

import { getCategoriesByDesignation } from '@/prisma/services/category';

import { useDesignation } from '@/contexts/DesignationContext';

import { CategoryWithDesignation } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function CategoriesPage() {
  const { activeDesignation } = useDesignation();
  const [categories, setCategories] = useState<CategoryWithDesignation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDesignation) {
      setCategories([]);
      return;
    }

    setLoading(true);
    setError(null);
    getCategoriesByDesignation({ designationId: activeDesignation.id })
      .then(setCategories)
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }, [activeDesignation]);

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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState message="Something went wrong" description={error} />
      ) : !activeDesignation || categories.length === 0 ? (
        <EmptyState
          message="No categories found"
          description={
            activeDesignation
              ? 'This designation has no spending categories yet'
              : 'Select a designation to view its categories'
          }
        />
      ) : (
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
      )}
    </div>
  );
}
