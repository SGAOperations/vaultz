'use client';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { getPeriodById } from '@/prisma/services/period';

import { CreateAllocationGroupDialog } from '@/components/create-allocation-group-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function AllocationGroups() {
  const { selectedDesignation } = useDesignation();
  const { selectedPeriod } = usePeriod();
  const { data: selectedPeriodData } = useQuery({
    queryKey: ['period', selectedPeriod?.id],
    queryFn: () => (selectedPeriod?.id ? getPeriodById(selectedPeriod.id) : null),
    enabled: !!selectedPeriod,
  });

  const selectedPeriodYear = selectedPeriodData?.year.name;

  if (!selectedDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Allocation Groups"
        description={`Organize and manage your budget allocations · DN${selectedDesignation.code}${selectedPeriod && selectedPeriodYear ? ` · ${selectedPeriodYear} · ${selectedPeriod.name}` : selectedPeriod ? ` · ${selectedPeriod.name}` : ''}`}
        actions={
          <CreateAllocationGroupDialog
            designationId={selectedDesignation.id}
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
        <Content designationId={selectedDesignation.id} />
      )}
    </div>
  );
}
