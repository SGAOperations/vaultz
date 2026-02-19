'use client';

import { use } from 'react';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { EmptyState } from '@/components/empty-state';

export function AllocationGroupsList({
  groupsPromise,
}: {
  groupsPromise: ReturnType<typeof getAllAllocationGroups>;
}) {
  const groups = use(groupsPromise);

  if (groups.length === 0)
    return (
      <EmptyState
        message="No allocation groups yet"
        description="Create your first allocation group to organize your budget"
      />
    );

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      {groups.map((v) => (
        <AllocationGroupCard key={v.id} allocationGroup={v} />
      ))}
    </div>
  );
}
