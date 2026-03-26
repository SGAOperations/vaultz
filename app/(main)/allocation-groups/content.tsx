'use client';

import Link from 'next/link';

import { usePeriod } from '@/contexts/PeriodContext';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Layers } from 'lucide-react';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { AllocationGroupsSummary } from '@/components/allocation-groups-summary';
import { EmptyState } from '@/components/empty-state';
import { SectionHeader } from '@/components/section-header';
import { Card } from '@/components/ui/card';

import { AllocationGroupsSkeleton } from './skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const { selectedPeriod } = usePeriod();

  const {
    data: allocationGroups,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['allocation-groups', designationId, selectedPeriod?.id],
    queryFn: () =>
      getAllAllocationGroups(designationId, selectedPeriod?.id ?? undefined),
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

  const { activeGroups, emptyGroups } = allocationGroups!.reduce(
    (acc, group) => {
      if (group.allocations.length > 0) acc.activeGroups.push(group);
      else acc.emptyGroups.push(group);
      return acc;
    },
    {
      activeGroups: [] as NonNullable<typeof allocationGroups>,
      emptyGroups: [] as NonNullable<typeof allocationGroups>,
    },
  );

  return (
    <div className="flex w-full flex-col">
      {activeGroups.length > 0 ? (
        <>
          <AllocationGroupsSummary allocationGroups={activeGroups} />
          <SectionHeader title="Allocation Groups" />
          <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
            {activeGroups.map((allocationGroup) => (
              <AllocationGroupCard
                key={allocationGroup.id}
                allocationGroup={allocationGroup}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          message="No active allocation groups"
          description="None of your allocation groups have allocations in the current period"
        />
      )}
      {emptyGroups.length > 0 && (
        <>
          <SectionHeader title="Unused Allocation Groups" />
          <div className="grid w-full grid-cols-3 gap-2">
            {emptyGroups.map((group) => (
              <Link
                key={group.id}
                href={`/allocation-groups/${group.id}`}
                prefetch={false}
                className="group"
              >
                <Card className="hover:border-primary/30 flex flex-row items-center justify-between gap-2 px-3 py-2 transition-all duration-200 hover:shadow-md">
                  <div className="flex min-w-0 items-center gap-2">
                    <Layers className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                      {group.name}
                    </span>
                  </div>
                  <ChevronRight className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
