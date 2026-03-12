import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMiscAllocationsOnly } from '@/prisma/services/allocation';
import { getAllAllocationGroupsWithAllocationsOnly } from '@/prisma/services/allocation-groups';
import { getCategoryById } from '@/prisma/services/category';
import { getTransfersByCategory } from '@/prisma/services/transfer';

import { CategoryActionsMenu } from '@/components/category-actions-menu';
import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';

export const metadata: Metadata = { title: 'Spending Category' };

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  const category = await getCategoryById({ id: categoryId });
  if (category === null) notFound();

  const [allocationGroups, miscAllocations, transfers] = await Promise.all([
    getAllAllocationGroups(category.designationId),
    getMiscAllocations(category.designationId),
    getTransfersByCategory(categoryId),
  ]);

  const spent = category.purchases
    .filter((purchase) => !purchase.excludeFromTotal)
    .reduce((acc, purchase) => acc + purchase.amount, 0);
  const budget = category.categoryYears.reduce((acc, cy) => acc + cy.amount, 0);
  const transfersIn = transfers
    .filter((t) => t.toCategoryId === categoryId)
    .reduce((acc, t) => acc + t.amount, 0);
  const transfersOut = transfers
    .filter((t) => t.fromCategoryId === categoryId)
    .reduce((acc, t) => acc + t.amount, 0);
  const available = budget + transfersIn - transfersOut - spent;
  const adjustedBudget = budget + transfersIn - transfersOut;

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={category.name}
        description={`SC${category.code} · DN${category.designation.code}`}
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog
              categories={[category]}
              users={users}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
            <CategoryActionsMenu category={category} />
          </div>
        }
      />

      <StatCards total={adjustedBudget} spent={spent} remaining={available} />

      <SectionHeader title="Purchases" />

      <PurchaseList
        purchases={category.purchases}
        categories={[category]}
        allocationGroups={allocationGroups}
        miscAllocations={miscAllocations}
      />
    </div>
  );
}
