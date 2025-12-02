import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Pencil } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getUserById, getUsers } from '@/prisma/services/user';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { SectionHeader } from '@/components/section-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { UserDialog } from '@/components/user-dialog';

export const metadata: Metadata = { title: 'User' };

export default async function UserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [user, users, categories, allocationGroups, miscAllocations] =
    await Promise.all([
      getUserById({ id: userId }),
      getUsers(),
      getAllCategories(),
      getAllAllocationGroups(),
      getMiscAllocations(),
    ]);
  if (user === null) notFound();

  const totalSpent = user.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  const purchaseCount = user.purchases.length;
  const averagePurchase = purchaseCount > 0 ? totalSpent / purchaseCount : 0;

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={`${user.first} ${user.last}`}
        description="User profile and purchase history"
        actions={
          <UserDialog user={user}>
            <Button variant="outline" className="gap-2">
              <Pencil className="size-4" />
              Edit User
            </Button>
          </UserDialog>
        }
      />

      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard value={totalSpent} label="Total Spent" variant="spent" />
        <StatCard
          value={purchaseCount}
          label="Purchases"
          variant="count"
          format="number"
        />
        <StatCard
          value={averagePurchase}
          label="Avg. Purchase"
          variant="average"
        />
      </div>

      <SectionHeader title="Purchases" />

      {user.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="This user hasn't made any purchases"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {user.purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              categories={categories}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
