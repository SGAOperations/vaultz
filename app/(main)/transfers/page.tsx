'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { getCategoriesWithAvailableAmount } from '@/prisma/services/category';

import { PageHeader } from '@/components/page-header';
import { TransferDialog } from '@/components/transfer-dialog';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function TransfersPage() {
  const { selectedDesignation } = useDesignation();

  if (!selectedDesignation) redirect('/designation');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-with-available', selectedDesignation.id],
    queryFn: () =>
      getCategoriesWithAvailableAmount({
        designationId: selectedDesignation.id,
      }),
  });

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Transfer History"
        description={`${selectedDesignation.name} · DN${selectedDesignation.code}`}
        actions={
          <TransferDialog
            categories={categories}
            trigger={
              <Button>
                <Plus className="size-4" />
                New Transfer
              </Button>
            }
          />
        }
      />
      <Content designationId={selectedDesignation.id} />
    </div>
  );
}
