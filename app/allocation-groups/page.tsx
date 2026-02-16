import { Plus } from 'lucide-react';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllDesignations } from '@/prisma/services/designation';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { CreateAllocationGroupDialog } from '@/components/create-allocation-group-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default async function AllocationGroups() {
  const allocationGroups = await getAllAllocationGroups();
  const designations = await getAllDesignations();
  const firstDesignation = designations[0];

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Allocation Groups"
        description="Organize and manage your budget allocations"
        actions={
          firstDesignation && (
            <CreateAllocationGroupDialog
              designationId={firstDesignation.id}
              trigger={
                <Button className="gap-2 shadow-sm">
                  <Plus className="size-4" />
                  Create Allocation Group
                </Button>
              }
            />
          )
        }
      />

      {allocationGroups.length === 0 ? (
        <EmptyState
          message="No allocation groups yet"
          description="Create your first allocation group to organize your budget"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {allocationGroups.map((v, i) => (
            <AllocationGroupCard key={i} allocationGroup={v} />
          ))}
        </div>
      )}
    </div>
  );
}
