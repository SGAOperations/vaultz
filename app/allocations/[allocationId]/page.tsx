import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllocationById } from '@/prisma/services/allocation';

import { formatNumber } from '@/lib/utils';

import { PurchaseCard } from '@/components/purchase-card';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Account' };

export default async function Allocation({
  params,
}: {
  params: Promise<{ allocationId: string }>;
}) {
  const { allocationId } = await params;

  const allocation = await getAllocationById({ id: allocationId });
  if (allocation === null) notFound();

  const spent = allocation.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(allocation.amount)}</p>
          <p className="text-muted-foreground text-sm">Total</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(spent)}</p>
          <p className="text-muted-foreground text-sm">Spent</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(allocation.amount - spent)}</p>
          <p className="text-muted-foreground text-sm">Remaining</p>
        </Card>
      </div>

      <h2 className="mt-4 text-xl">Purchases</h2>
      {allocation.purchases.length === 0 && (
        <p className="text-muted-foreground">No purchases found.</p>
      )}
      <div className="flex flex-col gap-3">
        {allocation.purchases.map((purchase) => (
          <PurchaseCard key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </div>
  );
}
