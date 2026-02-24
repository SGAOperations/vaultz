import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ChevronRight,
  CreditCard,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getCategoriesByDesignation } from '@/prisma/services/category';
import { getDesignation } from '@/prisma/services/designation';
import { getUsers } from '@/prisma/services/user';

import { cn, formatNumber } from '@/lib/utils';

import { CreateCategoryDialog } from '@/components/create-category-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Designation' };

export default async function DesignationPage({
  params,
}: {
  params: Promise<{ designationId: string }>;
}) {
  const { designationId } = await params;

  const designation = await getDesignation({ id: designationId });
  if (designation === null) notFound();

  const allocationGroups = await getAllAllocationGroups(designationId);
  const miscAllocations = await getMiscAllocations(designationId);
  const categories = await getCategoriesByDesignation({ designationId });
  const users = await getUsers();

  const spent = designation.purchases
    .filter((purchase) => !purchase.excludeFromTotal)
    .reduce((acc, purchase) => acc + purchase.amount, 0);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={designation.name}
        description={`Designation code: DN${designation.code}`}
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog
              users={users}
              categories={categories}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
            <CreateCategoryDialog
              designationId={designationId}
              trigger={
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" />
                  Create Spending Category
                </Button>
              }
            />
          </div>
        }
      />

      <StatCards total={designation.amount} spent={spent} />

      <SectionHeader title="Spending Categories" />

      {categories.length === 0 ? (
        <EmptyState
          message="No spending categories yet"
          description="Create categories to organize this designation's budget"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {categories.map((category) => {
            const categorySpent = designation.purchases
              .filter((v) => v.categoryId === category.id)
              .filter((v) => !v.excludeFromTotal)
              .reduce((acc, purchase) => acc + purchase.amount, 0);
            const budget = category.categoryYears.reduce(
              (acc, cy) => acc + cy.amount,
              0,
            );
            const remaining = budget - categorySpent;

            return (
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
                  <div className="flex flex-wrap gap-2">
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
                          ${formatNumber(categorySpent)}
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
      )}

      <SectionHeader title="Purchases" />

      {designation.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this designation"
        />
      ) : (
        <PurchaseList
          purchases={designation.purchases}
          users={users}
          categories={categories}
          allocationGroups={allocationGroups}
          miscAllocations={miscAllocations}
        />
      )}
    </div>
  );
}
