import { CreateAccountDialog } from '@/components/create-account-dialog';
import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { getIndex } from '@/prisma/services';
import { getAccountsByIndex } from '@/prisma/services/account';
import { getUsers } from '@/prisma/services/user';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Index' };

export default async function Index({
  params,
}: {
  params: Promise<{ indexId: string }>;
}) {
  const { indexId } = await params;

  const index = await getIndex({ id: indexId });
  if (index === null) notFound();

  const accounts = await getAccountsByIndex({ indexId });
  const users = await getUsers();

  const spent = index.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <div className="w-full flex flex-row gap-3">
        <CreatePurchaseDialog users={users} accounts={accounts} />
        <CreateAccountDialog indexId={indexId} />
      </div>

      <h2 className="mt-4 text-xl">Accounts</h2>
      <div className="grid grid-cols-4 gap-3">
        {accounts.map((account) => (
          <Card key={account.id} className="flex flex-row justify-between py-3">
            <p>{account.code}</p>
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
        ))}
      </div>

      <h2 className="mt-4 text-xl">Purchases</h2>
      <div className="flex flex-col gap-3">
        {index.purchases.map((purchase) => (
          <Card key={purchase.id} className="grid grid-cols-3 py-3">
            <p>${formatNumber(purchase.amount)}</p>
            <p>
              {purchase.user.first} {purchase.user.last}
            </p>
            <p>{purchase.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
