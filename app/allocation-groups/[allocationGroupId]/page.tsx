import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Plus } from 'lucide-react';

import { getAllAccounts } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllocationGroup } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { CreateAllocationDialog } from '@/components/create-allocation-dialog';
import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { PurchaseCard } from '@/components/purchase-card';
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
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const spent = purchases.reduce((acc, purchase) => acc + purchase.amount, 0);

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="mt-4 text-3xl font-bold">{allocationGroup.name}</h1>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(amount)}</p>
          <p className="text-muted-foreground text-sm">Total</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(spent)}</p>
          <p className="text-muted-foreground text-sm">Spent</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(amount - spent)}</p>
          <p className="text-muted-foreground text-sm">Remaining</p>
        </Card>
      </div>

      <div className="flex w-full flex-row gap-3">
        <CreatePurchaseDialog
          users={users}
          accounts={accounts}
          allocationGroups={[allocationGroup]}
          miscAllocations={miscAllocations}
        />
        <CreateAllocationDialog
          trigger={
            <Button className="flex-1">
              <Plus />
              Create Allocation
            </Button>
          }
          allocationGroupId={allocationGroup.id}
        />
      </div>

      <h2 className="mt-4 text-xl">Allocations</h2>
      {allocationGroup.allocations.length === 0 && (
        <p className="text-muted-foreground">No allocations found.</p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {allocationGroup.allocations.map((allocation) => (
          <Link href={`/allocations/${allocation.id}`} key={allocation.id}>
            <Card className="hover:bg-accent flex flex-row justify-between py-3">
              <p>{allocation.name}</p>
              <p>
                $
                {formatNumber(
                  allocation.amount -
                    allocation.purchases.reduce(
                      (acc, purchase) => acc + purchase.amount,
                      0,
                    ),
                )}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mt-4 text-xl">Purchases</h2>
      {purchases.length === 0 && (
        <p className="text-muted-foreground">No purchases found.</p>
      )}
      <div className="flex flex-col gap-3">
        {purchases.map((purchase) => (
          <PurchaseCard key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </div>
  );
}
