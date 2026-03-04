import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllocationGroup } from '@/prisma/services/allocation-groups';

import { Content } from './content';

export const metadata: Metadata = { title: 'Allocation Group' };

export default async function AllocationGroup({
  params,
}: {
  params: Promise<{ allocationGroupId: string }>;
}) {
  const { allocationGroupId } = await params;

  const allocationGroup = await getAllocationGroup({ id: allocationGroupId });
  if (allocationGroup === null) notFound();

  return <Content allocationGroupId={allocationGroupId} />;
}
