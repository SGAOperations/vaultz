'use client';

import { Suspense, useMemo } from 'react';

import { AllocationGroupsList } from '@/app/allocation-groups/list';
import { AllocationGroupsSkeleton } from '@/app/allocation-groups/skeleton';
import { useDesignation } from '@/contexts/DesignationContext';
import { Plus } from 'lucide-react';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';

import { CreateAllocationGroupDialog } from '@/components/create-allocation-group-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default function AllocationGroups() {
  const { activeDesignation } = useDesignation();
  const groupsPromise = useMemo(
    () => getAllAllocationGroups(activeDesignation?.id),
    [activeDesignation?.id],
  );

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Allocation Groups"
        description="Organize and manage your budget allocations"
        actions={
          activeDesignation ? (
            <CreateAllocationGroupDialog
              designationId={activeDesignation.id}
              trigger={
                <Button className="gap-2 shadow-sm">
                  <Plus className="size-4" />
                  Create Allocation Group
                </Button>
              }
            />
          ) : null
        }
      />

      {!activeDesignation ? (
        <EmptyState
          message="No designation selected"
          description="Select a designation to view allocation groups"
        />
      ) : (
        <Suspense
          key={activeDesignation.id}
          fallback={<AllocationGroupsSkeleton />}
        >
          <AllocationGroupsList groupsPromise={groupsPromise} />
        </Suspense>
      )}
    </div>
  );
}
