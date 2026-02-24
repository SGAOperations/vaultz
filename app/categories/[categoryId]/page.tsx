import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import {
  getCategoriesWithAvailableAmount,
  getCategoryById,
} from '@/prisma/services/category';
import { getUsers } from '@/prisma/services/user';

import { CategoryActionsMenu } from '@/components/category-actions-menu';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { TransferDialog } from '@/components/transfer-dialog';

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

  const allocationGroups = await getAllAllocationGroups(category.designationId);
  const miscAllocations = await getMiscAllocations(category.designationId);
  const processTemplates = await getAllProcessTemplates(true);
  const categoriesWithAvailable = await getCategoriesWithAvailableAmount({
    designationId: category.designationId,
  });

  const spent = category.purchases
    .filter((purchase) => !purchase.excludeFromTotal)
    .reduce((acc, purchase) => acc + purchase.amount, 0);
  const budget = category.categoryYears.reduce((acc, cy) => acc + cy.amount, 0);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={category.name}
        description={`Category code: SC${category.code}`}
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog
              users={users}
              categories={[category]}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
              processTemplates={processTemplates}
            />
            <TransferDialog categories={categoriesWithAvailable} />
            <CategoryActionsMenu category={category} />
          </div>
        }
      />

      <StatCards total={budget} spent={spent} />

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
