'use client';

import { useQuery } from '@tanstack/react-query';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { EmptyState } from '@/components/empty-state';

import { AllocationGroupsSkeleton } from './skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const {
    data: allocationGroups,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['allocation-groups', designationId],
    queryFn: () => getAllAllocationGroups(designationId),
  });

  if (isLoading) return <AllocationGroupsSkeleton />;

  if (isError) return <EmptyState message="Failed to load allocation groups" />;

  if (allocationGroups!.length === 0)
    return (
      <EmptyState
        message="No allocation groups yet"
        description="Create your first allocation group to organize your budget"
      />
    );

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      {allocationGroups!.map((allocationGroup) => (
        <AllocationGroupCard
          key={allocationGroup.id}
          allocationGroup={allocationGroup}
        />
      ))}
    </div>
  );
}
