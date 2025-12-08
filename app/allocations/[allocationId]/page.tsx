import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllocationById } from '@/prisma/services/allocation';
import { getAllCategories } from '@/prisma/services/category';
import { getUsers } from '@/prisma/services/user';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';

export const metadata: Metadata = { title: 'Allocation' };

export default async function Allocation({
  params,
}: {
  params: Promise<{ allocationId: string }>;
}) {
  const { allocationId } = await params;

  const allocation = await getAllocationById({ id: allocationId });
  if (allocation === null) notFound();

  const categories = await getAllCategories();
  const users = await getUsers();

  const spent = allocation.purchases
    .filter((purchase) => !purchase.excludeFromTotal)
    .reduce((acc, purchase) => acc + purchase.amount, 0);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={allocation.name}
        actions={
          <CreatePurchaseDialog
            users={users}
            categories={categories}
            miscAllocations={[allocation]}
          />
        }
      />

      <StatCards total={allocation.amount} spent={spent} />

      <SectionHeader title="Purchases" />

      {allocation.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this allocation"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {allocation.purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              categories={categories}
              allocationGroups={[]}
              miscAllocations={[allocation]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
