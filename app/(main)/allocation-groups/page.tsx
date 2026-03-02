'use client';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { Plus } from 'lucide-react';

import { CreateAllocationGroupDialog } from '@/components/create-allocation-group-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function AllocationGroups() {
  const { activeDesignation } = useDesignation();
  const { periods, selectedPeriod } = usePeriod();

  if (!activeDesignation) redirect('/designation');
  if (periods.length === 0) redirect('/periods');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Allocation Groups"
        description={`Organize and manage your budget allocations · DN${activeDesignation.code}${selectedPeriod ? ` · ${selectedPeriod.name}` : ''}`}
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
      {!selectedPeriod ? (
        <EmptyState
          message="No period selected"
          description="Select or create a fiscal period to view and manage allocations"
          action={
            <Link href="/periods">
              <Button size="sm">
                <Plus className="size-4" />
                Create Period
              </Button>
            </Link>
          }
        />
      ) : (
        <Content designationId={activeDesignation.id} />
      )}
    </div>
  );
}
