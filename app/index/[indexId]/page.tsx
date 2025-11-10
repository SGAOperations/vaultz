import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Plus } from 'lucide-react';

import { getIndex } from '@/prisma/services';
import { getAccountsByIndex } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { CreateAccountDialog } from '@/components/create-account-dialog';
import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { PurchaseCard } from '@/components/purchase-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Index' };

export default async function Index({
  params,
}: {
  params: Promise<{ indexId: string }>;
}) {
  const { indexId } = await params;

  const index = await getIndex({ id: indexId });
  if (index === null) notFound();

  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();
  const accounts = await getAccountsByIndex({ indexId });
  const users = await getUsers();

  const spent = index.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="text-3xl font-bold">{index.name}</h1>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(index.amount)}</p>
          <p className="text-muted-foreground text-sm">Total</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(spent)}</p>
          <p className="text-muted-foreground text-sm">Spent</p>
        </Card>
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(index.amount - spent)}</p>
          <p className="text-muted-foreground text-sm">Remaining</p>
        </Card>
      </div>

      <div className="flex w-full flex-row gap-3">
        <CreatePurchaseDialog
          users={users}
          accounts={accounts}
          allocationGroups={allocationGroups}
          miscAllocations={miscAllocations}
        />
        <CreateAccountDialog
          indexId={indexId}
          trigger={
            <Button className="flex-1">
              <Plus />
              Create Account
            </Button>
          }
        />
      </div>

      <h2 className="mt-4 text-xl">Accounts</h2>
      {accounts.length === 0 && (
        <p className="text-muted-foreground">No accounts found.</p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {accounts.map((account) => (
          <Link href={`/account/${account.id}`} key={account.id}>
            <Card className="hover:bg-accent flex flex-row justify-between py-3">
              <p>
                {account.name} ({account.code})
              </p>
              <p>
                $
                {formatNumber(
                  account.amount -
                    index.purchases
                      .filter((v) => v.accountId == account.id)
                      .reduce((acc, purchase) => acc + purchase.amount, 0),
                )}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mt-4 text-xl">Purchases</h2>
      {index.purchases.length === 0 && (
        <p className="text-muted-foreground">No purchases found.</p>
      )}
      <div className="flex flex-col gap-3">
        {index.purchases.map((purchase) => (
          <PurchaseCard key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </div>
  );
}
