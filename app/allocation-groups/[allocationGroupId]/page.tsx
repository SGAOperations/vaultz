import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChevronRight, DollarSign, Layers, Plus } from 'lucide-react';

import { getAllAccounts } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllocationGroup } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { CreateAllocationDialog } from '@/components/create-allocation-dialog';
import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
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

  const accounts = await getAllAccounts();
  const miscAllocations = await getMiscAllocations();
  const users = await getUsers();

  const amount = allocationGroup.allocations.reduce(
    (acc, allocation) => acc + allocation.amount,
    0,
  );

  const purchases = allocationGroup.allocations
    .flatMap((allocation) => allocation.purchases)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const spent = purchases.reduce((acc, purchase) => acc + purchase.amount, 0);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={allocationGroup.name}
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog
              users={users}
              accounts={accounts}
              allocationGroups={[allocationGroup]}
              miscAllocations={miscAllocations}
            />
            <CreateAllocationDialog
              trigger={
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" />
                  Create Allocation
                </Button>
              }
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {allocationGroup.allocations.map((allocation) => {
            const allocationSpent = allocation.purchases.reduce(
              (acc, purchase) => acc + purchase.amount,
              0,
            );
            const remaining = allocation.amount - allocationSpent;

            return (
              <Link
                href={`/allocations/${allocation.id}`}
                key={allocation.id}
                className="group"
              >
                <Card className="hover:border-primary/30 p-5 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl">
                        <Layers className="text-primary size-6" />
                      </div>
                      <div>
                        <h3 className="group-hover:text-primary text-lg font-semibold transition-colors">
                          {allocation.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {allocation.purchases.length} purchase
                          {allocation.purchases.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-stat-total/10 rounded-lg p-3 text-center">
                      <DollarSign className="text-stat-total mx-auto mb-1 size-4" />
                      <p className="font-semibold">
                        ${formatNumber(allocation.amount)}
                      </p>
                      <p className="text-muted-foreground text-xs">Budget</p>
                    </div>
                    <div className="bg-stat-spent/10 rounded-lg p-3 text-center">
                      <DollarSign className="text-stat-spent mx-auto mb-1 size-4" />
                      <p className="font-semibold">
                        ${formatNumber(allocationSpent)}
                      </p>
                      <p className="text-muted-foreground text-xs">Spent</p>
                    </div>
                    <div className="bg-stat-remaining/10 rounded-lg p-3 text-center">
                      <DollarSign className="text-stat-remaining mx-auto mb-1 size-4" />
                      <p className="font-semibold">
                        ${formatNumber(remaining)}
                      </p>
                      <p className="text-muted-foreground text-xs">Remaining</p>
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
            <PurchaseCard key={purchase.id} purchase={purchase} />
          ))}
        </div>
      )}
    </div>
  );
}
