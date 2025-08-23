import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { getIndex } from '@/prisma/services';
import { getAccountsByIndex } from '@/prisma/services/account';
import { getUsers } from '@/prisma/services/user';
import { notFound } from 'next/navigation';

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
    <div className="w-full">
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
        <CreatePurchaseDialog users={users} accounts={accounts} />
      </div>
    </div>
  );
}
