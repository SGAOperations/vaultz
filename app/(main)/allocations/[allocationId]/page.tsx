import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllocationByIdWithStats } from '@/prisma/services/allocation';
import { getAllCategories } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getUsers } from '@/prisma/services/user';

import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { PurchaseList } from '@/components/purchase-list';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { UsageBar } from '@/components/usage-bar';

export const metadata: Metadata = { title: 'Allocation' };

export default async function Allocation({
  params,
}: {
  params: Promise<{ allocationId: string }>;
}) {
  const { allocationId } = await params;

  const allocation = await getAllocationByIdWithStats({ id: allocationId });
  if (allocation === null) notFound();

  const categories = await getAllCategories();
  const users = await getUsers();
  const processTemplates = await getAllProcessTemplates(true);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={allocation.name}
        description={`DN${allocation.designation.code} · ${allocation.period.name}`}
        actions={
          <CreatePurchaseDialog
            users={users}
            categories={categories}
            miscAllocations={[allocation]}
            processTemplates={processTemplates}
          />
        }
      />

      <div className="mb-2 flex flex-col gap-3">
        <StatCards total={allocation.amount} spent={allocation.spent} />
        <UsageBar total={allocation.amount} spent={allocation.spent} />
      </div>

      <SectionHeader title="Purchases" />

      <PurchaseList
        purchases={allocation.purchases}
        users={users}
        categories={categories}
        allocationGroups={[]}
        miscAllocations={[allocation]}
        processTemplates={processTemplates}
      />
    </div>
  );
}
