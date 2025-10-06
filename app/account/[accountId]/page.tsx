import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Plus } from 'lucide-react';

import { getAccountById } from '@/prisma/services/account';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { PurchaseCard } from '@/components/purchase-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Account' };

export default async function Index({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  const account = await getAccountById({ id: accountId });
  if (account === null) notFound();

  const users = await getUsers();

  const allocationGroups = await getAllAllocationGroups();

  const spent = account.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(account.amount)}</p>
          <p className="text-muted-foreground text-sm">Total</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(spent)}</p>
          <p className="text-muted-foreground text-sm">Spent</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(account.amount - spent)}</p>
          <p className="text-muted-foreground text-sm">Remaining</p>
        </Card>
      </div>

      <CreatePurchaseDialog
        users={users}
        accounts={[account]}
        allocationGroups={allocationGroups}
      />

      <h2 className="mt-4 text-xl">Purchases</h2>
      {account.purchases.length === 0 && (
        <p className="text-muted-foreground">No purchases found.</p>
      )}
      <div className="flex flex-col gap-3">
        {account.purchases.map((purchase) => (
          <PurchaseCard key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </div>
  );
}
