import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArrowLeftRight } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllCategories, getCategoryById } from '@/prisma/services/category';
import { getUsers } from '@/prisma/services/user';

import { CategoryActionsMenu } from '@/components/category-actions-menu';
import { CreateTransferDialog } from '@/components/create-transfer-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Spending Category' };

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  const category = await getCategoryById({ id: categoryId });
  if (category === null) notFound();

  const users = await getUsers();
  const categories = await getAllCategories();

  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();

  const spent = category.purchases
    .filter((purchase) => !purchase.excludeFromTotal)
    .reduce((acc, purchase) => acc + purchase.amount, 0);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={category.name}
        description={`Category code: SC${category.code}`}
        actions={
          <div className="flex gap-2">
            <CreateTransferDialog
              trigger={
                <Button variant="outline">
                  <ArrowLeftRight />
                  Transfer Funds
                </Button>
              }
              categories={categories}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
              defaultAccountType="category"
              defaultSourceId={categoryId}
            />
            <CreatePurchaseDialog
              users={users}
              categories={[category]}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
            <CategoryActionsMenu category={category} />
          </div>
        }
      />

      <StatCards total={category.amount} spent={spent} />

      <SectionHeader title="Purchases" />

      {category.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this category"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {category.purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              categories={[category]}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
