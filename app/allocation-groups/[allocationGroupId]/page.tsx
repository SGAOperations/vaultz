import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ChevronRight,
  Layers,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllocationGroup } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getUsers } from '@/prisma/services/user';

import { cn, formatNumber } from '@/lib/utils';

import { CreateAllocationDialog } from '@/components/create-allocation-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Allocation Group' };

export default async function AllocationGroup({
  params,
}: {
  params: Promise<{ allocationGroupId: string }>;
}) {
  const { allocationGroupId } = await params;

  const allocationGroup = await getAllocationGroup({ id: allocationGroupId });
  if (allocationGroup === null) notFound();

  const categories = await getAllCategories();
  const miscAllocations = await getMiscAllocations();
  const users = await getUsers();
  const processTemplates = await getAllProcessTemplates(true);

  const amount = allocationGroup.allocations.reduce(
    (acc, allocation) => acc + allocation.amount,
    0,
  );

  const purchases = allocationGroup.allocations
    .flatMap((allocation) => allocation.purchases)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const spent = purchases
    .filter((purchase) => !purchase.excludeFromTotal)
    .reduce((acc, purchase) => acc + purchase.amount, 0);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={allocationGroup.name}
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog
              users={users}
              categories={categories}
              allocationGroups={[allocationGroup]}
              miscAllocations={miscAllocations}
              processTemplates={processTemplates}
            />
            <CreateAllocationDialog
              trigger={
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" />
                  Create Allocation
                </Button>
              }
              designationId={allocationGroup.designationId}
              allocationGroupId={allocationGroup.id}
            />
          </div>
        }
      />

      <StatCards total={amount} spent={spent} />

      <SectionHeader title="Allocations" />

      {allocationGroup.allocations.length === 0 ? (
        <EmptyState
          message="No allocations yet"
          description="Create allocations to organize this group's budget"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {allocationGroup.allocations.map((allocation) => {
            const allocationSpent = allocation.purchases
              .filter((purchase) => !purchase.excludeFromTotal)
              .reduce((acc, purchase) => acc + purchase.amount, 0);
            const remaining = allocation.amount - allocationSpent;

            return (
              <Link
                href={`/allocations/${allocation.id}`}
                key={allocation.id}
                className="group"
              >
                <Card className="hover:border-primary/30 p-4 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <Layers className="text-primary size-5" />
                      </div>
                      <div>
                        <h3 className="group-hover:text-primary font-semibold transition-colors">
                          {allocation.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {allocation.purchases.length} purchase
                          {allocation.purchases.length !== 1 ? 's' : ''}
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
                          ${formatNumber(allocation.amount)}
                        </span>
                      </span>
                    </div>
                    <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                      <TrendingDown className="text-stat-spent size-4" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Spent:</span>{' '}
                        <span className="font-semibold">
                          ${formatNumber(allocationSpent)}
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

      {purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this group"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              categories={categories}
              allocationGroups={[allocationGroup]}
              miscAllocations={miscAllocations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
