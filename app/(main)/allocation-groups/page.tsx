'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { Plus } from 'lucide-react';

import { CreateAllocationGroupDialog } from '@/components/create-allocation-group-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function AllocationGroups() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Allocation Groups"
        description={`Organize and manage your budget allocations · DN${activeDesignation.code}`}
        actions={
          <CreateAllocationGroupDialog
            designationId={activeDesignation.id}
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Allocation Group
              </Button>
            }
          />
        }
      />
      <Content designationId={activeDesignation.id} />
    </div>
  );
}
