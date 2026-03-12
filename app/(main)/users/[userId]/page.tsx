import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Pencil } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getUserById } from '@/prisma/services/user';

import { PageHeader } from '@/components/page-header';
import { PurchaseList } from '@/components/purchase-list';
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

  const [user, categories, allocationGroups, miscAllocations] =
    await Promise.all([
      getUserById({ id: userId }),
      getAllCategories(),
      getAllAllocationGroups(),
      getMiscAllocations(),
    ]);
  if (user === null) notFound();

  const filteredPurchases = user.purchases.filter(
    (purchase) => !purchase.excludeFromTotal,
  );
  const totalSpent = filteredPurchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  const purchaseCount = user.purchases.length;
  const filteredPurchaseCount = filteredPurchases.length;
  const averagePurchase =
    filteredPurchaseCount > 0 ? totalSpent / filteredPurchaseCount : 0;

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

      <PurchaseList
        purchases={user.purchases}
        categories={categories}
        allocationGroups={allocationGroups}
        miscAllocations={miscAllocations}
      />
    </div>
  );
}
