import { Plus } from 'lucide-react';

import { getAllIndexes } from '@/prisma/services';
import { getAllAccounts } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getLatestPurchases } from '@/prisma/services/purchase';
import { getUsers } from '@/prisma/services/user';

import { CreateIndexDialog } from '@/components/create-index-dialog';
import { EmptyState } from '@/components/empty-state';
import { IndexCard } from '@/components/index-card';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const indexes = await getAllIndexes();
  const latestPurchases = await getLatestPurchases(10);
  const users = await getUsers();
  const accounts = await getAllAccounts();
  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Indexes"
        description="Manage your financial indexes and track all purchases"
        actions={
          <CreateIndexDialog
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Index
              </Button>
            }
          />
        }
      />

      {indexes.length === 0 ? (
        <EmptyState
          message="No indexes yet"
          description="Create your first index to start tracking purchases"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {indexes.map((v, i) => (
            <IndexCard key={i} index={v} />
          ))}
        </div>
      )}

      <SectionHeader title="Latest Purchases" />

      {latestPurchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Purchases will appear here as they are recorded"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {latestPurchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              accounts={accounts}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
