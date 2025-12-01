import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAccountById } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';

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
  const miscAllocations = await getMiscAllocations();

  const spent = account.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={account.name}
        description={`Account code: ${account.code}`}
        actions={
          <CreatePurchaseDialog
            users={users}
            accounts={[account]}
            allocationGroups={allocationGroups}
            miscAllocations={miscAllocations}
          />
        }
      />

      <StatCards total={account.amount} spent={spent} />

      <SectionHeader title="Purchases" />

      {account.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this account"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {account.purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              accounts={[account]}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
