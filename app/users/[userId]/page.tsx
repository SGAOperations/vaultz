import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getUserById } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { PurchaseCard } from '@/components/purchase-card';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'User' };

export default async function UserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await getUserById({ id: userId });
  if (user === null) notFound();

  const totalSpent = user.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="mt-4 text-3xl font-bold">
        {user.first} {user.last}
      </h1>
      <div className="grid w-full grid-cols-1 gap-4">
        <Card className="flex-row items-baseline">
          <p className="text-6xl">${formatNumber(totalSpent)}</p>
          <p className="text-muted-foreground text-sm">Total Spent</p>
        </Card>
      </div>

      <h2 className="mt-4 text-xl">Purchases</h2>
      {user.purchases.length === 0 && (
        <p className="text-muted-foreground">No purchases found.</p>
      )}
      <div className="flex flex-col gap-3">
        {user.purchases.map((purchase) => (
          <PurchaseCard key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </div>
  );
}
