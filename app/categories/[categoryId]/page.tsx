import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import {
  getCategoriesWithAvailableAmount,
  getCategoryById,
} from '@/prisma/services/category';
import { getTransfersByCategory } from '@/prisma/services/transfer';
import { getUsers } from '@/prisma/services/user';

import { getActiveYear, getAllYears } from '@/lib/period-utils';

import { CategoryActionsMenu } from '@/components/category-actions-menu';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { TransferDialog } from '@/components/transfer-dialog';
import { TransferList } from '@/components/transfer-list';

export const metadata: Metadata = { title: 'Spending Category' };

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  const category = await getCategoryById({ id: categoryId });
  if (category === null) notFound();

  const [
    users,
    allocationGroups,
    miscAllocations,
    categoriesWithAvailable,
    transfers,
    years,
    activeYear,
  ] = await Promise.all([
    getUsers(),
    getAllAllocationGroups(category.designationId),
    getMiscAllocations(category.designationId),
    getCategoriesWithAvailableAmount({ designationId: category.designationId }),
    getTransfersByCategory(categoryId),
    getAllYears(),
    getActiveYear(),
  ]);

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
            />
            <TransferDialog
              categories={categoriesWithAvailable}
              years={years}
              activeYearId={activeYear?.id ?? null}
            />
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

      <SectionHeader title="Transfers" />

      {transfers.length === 0 ? (
        <EmptyState
          message="No transfers yet"
          description="Transfer funds between categories to see them here"
        />
      ) : (
        <TransferList
          transfers={transfers}
          years={years}
          categoryId={categoryId}
        />
      )}
    </div>
  );
}
