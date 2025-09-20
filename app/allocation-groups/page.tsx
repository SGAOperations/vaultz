import { Plus } from 'lucide-react';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { CreateIndexDialog } from '@/components/create-index-dialog';
import { Button } from '@/components/ui/button';

export default async function AllocationGroups() {
  const allocationGroups = await getAllAllocationGroups();

  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
      {allocationGroups.map((v, i) => (
        <AllocationGroupCard key={i} allocationGroup={v} />
      ))}

      <CreateIndexDialog
        trigger={
          <Button>
            <Plus />
            Create Index
          </Button>
        }
      />
    </div>
  );
}
