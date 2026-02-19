'use client';

import { AllocationGroupWithAllocations } from '@/lib/types';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { EmptyState } from '@/components/empty-state';

export function AllocationGroupsList({
  groups,
}: {
  groups: AllocationGroupWithAllocations[];
}) {
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
