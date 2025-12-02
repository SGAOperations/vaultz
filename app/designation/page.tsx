import { Plus } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getAllDesignations } from '@/prisma/services/designation';
import { getLatestPurchases } from '@/prisma/services/purchase';
import { getUsers } from '@/prisma/services/user';

import { CreateDesignationDialog } from '@/components/create-designation-dialog';
import { DesignationCard } from '@/components/designation-card';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/ui/button';

export default async function DesignationsPage() {
  const designations = await getAllDesignations();
  const latestPurchases = await getLatestPurchases(10);
  const users = await getUsers();
  const categories = await getAllCategories();
  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Designations"
        description="Manage your financial designations and track all purchases"
        actions={
          <CreateDesignationDialog
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Designation
              </Button>
            }
          />
        }
      />

      {designations.length === 0 ? (
        <EmptyState
          message="No designations yet"
          description="Create your first designation to start tracking purchases"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {designations.map((v, i) => (
            <DesignationCard key={i} designation={v} />
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
