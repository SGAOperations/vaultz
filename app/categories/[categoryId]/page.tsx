import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import {
  getCategoriesWithAvailableAmount,
  getCategoryById,
} from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getTransfersByCategory } from '@/prisma/services/transfer';
import { getUsers } from '@/prisma/services/user';

import { CategoryActionsMenu } from '@/components/category-actions-menu';
import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { StatCards } from '@/components/stat-card';
import { TransferDialog } from '@/components/transfer-dialog';
import { TransferList } from '@/components/transfer-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    processTemplates,
    categoriesWithAvailable,
    transfers,
  ] = await Promise.all([
    getUsers(),
    getAllAllocationGroups(category.designationId),
    getMiscAllocations(category.designationId),
    getAllProcessTemplates(true),
    getCategoriesWithAvailableAmount({ designationId: category.designationId }),
    getTransfersByCategory(categoryId),
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
              processTemplates={processTemplates}
            />
            <TransferDialog categories={categoriesWithAvailable} />
            <CategoryActionsMenu category={category} />
          </div>
        }
      />

      <StatCards total={budget} spent={spent} />

      <Tabs defaultValue="purchases" className="mt-4">
        <TabsList>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <PurchaseList
            purchases={category.purchases}
            users={users}
            categories={[category]}
            allocationGroups={allocationGroups}
            miscAllocations={miscAllocations}
            processTemplates={processTemplates}
          />
        </TabsContent>

        <TabsContent value="transfers">
          <TransferList transfers={transfers} categoryId={categoryId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
