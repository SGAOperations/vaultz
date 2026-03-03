import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllocationGroupWithStats } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getUsers } from '@/prisma/services/user';

import { Content } from './content';

export const metadata: Metadata = { title: 'Allocation Group' };

export default async function AllocationGroup({
  params,
}: {
  params: Promise<{ allocationGroupId: string }>;
}) {
  const { allocationGroupId } = await params;

  const allocationGroup = await getAllocationGroupWithStats({
    id: allocationGroupId,
  });
  if (allocationGroup === null) notFound();

  const [categories, miscAllocations, users, processTemplates] =
    await Promise.all([
      getAllCategories(),
      getMiscAllocations(),
      getUsers(),
      getAllProcessTemplates(true),
    ]);

  return (
    <Content
      allocationGroupId={allocationGroupId}
      allocationGroup={allocationGroup}
      categories={categories}
      miscAllocations={miscAllocations}
      users={users}
      processTemplates={processTemplates}
    />
  );
}
