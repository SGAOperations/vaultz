import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllAccounts } from '@/prisma/services/account';
import { getAllocationById } from '@/prisma/services/allocation';
import { getUsers } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
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

  const accounts = await getAllAccounts();
  const users = await getUsers();

  const spent = allocation.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="mt-4 text-3xl font-bold">{allocation.name}</h1>
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

      <div className="flex w-full flex-row gap-3">
        <CreatePurchaseDialog
          users={users}
          accounts={accounts}
          miscAllocations={[allocation]}
        />
      </div>

      <h2 className="mt-4 text-xl">Purchases</h2>
      {allocation.purchases.length === 0 && (
        <p className="text-muted-foreground">No purchases found.</p>
      )}
      <div className="flex flex-col gap-3">
        {allocation.purchases.map((purchase) => (
          <PurchaseCard
            key={purchase.id}
            purchase={purchase}
            users={users}
            accounts={accounts}
            allocationGroups={[]}
            miscAllocations={[allocation]}
          />
        ))}
      </div>
    </div>
  );
}
