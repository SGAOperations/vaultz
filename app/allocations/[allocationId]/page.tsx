import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllAccounts } from '@/prisma/services/account';
import { getAllocationById } from '@/prisma/services/allocation';
import { getUsers } from '@/prisma/services/user';

import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
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

  const accounts = await getAllAccounts();
  const users = await getUsers();

  const spent = allocation.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col">
      <PageHeader title={allocation.name} />

      <StatCards total={allocation.amount} spent={spent} />

      <div className="mt-6 flex w-full flex-row gap-3">
        <CreatePurchaseDialog
          users={users}
          accounts={accounts}
          miscAllocations={[allocation]}
        />
      </div>

      <SectionHeader title="Purchases" />

      {allocation.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this allocation"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {allocation.purchases.map((purchase) => (
            <PurchaseCard key={purchase.id} purchase={purchase} />
          ))}
        </div>
      )}
    </div>
  );
}
