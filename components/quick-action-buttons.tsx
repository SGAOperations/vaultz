'use client';

import { usePeriod } from '@/contexts/PeriodContext';
import { useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getCategoriesByDesignation } from '@/prisma/services/category';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getUsers } from '@/prisma/services/user';

import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { Button } from '@/components/ui/button';
import { UserDialog } from '@/components/user-dialog';

interface QuickActionButtonsProps {
  designationId: string;
}

export function QuickActionButtons({ designationId }: QuickActionButtonsProps) {
  const { selectedPeriod } = usePeriod();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-by-designation', designationId],
    queryFn: () => getCategoriesByDesignation({ designationId }),
  });

  const { data: allocationGroups = [] } = useQuery({
    queryKey: ['allocation-groups', designationId, selectedPeriod?.id],
    queryFn: () =>
      getAllAllocationGroups(designationId, selectedPeriod?.id ?? undefined),
  });

  const { data: miscAllocations = [] } = useQuery({
    queryKey: ['misc-allocations', designationId, selectedPeriod?.id],
    queryFn: () =>
      getMiscAllocations(designationId, selectedPeriod?.id ?? undefined),
  });

  const { data: processTemplates = [] } = useQuery({
    queryKey: ['process-templates'],
    queryFn: () => getAllProcessTemplates(true),
  });

  return (
    <>
      <CreatePurchaseDialog
        users={users}
        categories={categories}
        allocationGroups={allocationGroups}
        miscAllocations={miscAllocations}
        processTemplates={processTemplates}
      />
      <UserDialog user={undefined}>
        <Button variant="outline" className="gap-2">
          <UserPlus className="size-4" />
          Add User
        </Button>
      </UserDialog>
    </>
  );
}
