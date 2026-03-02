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
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) redirect('/designation');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-with-available', activeDesignation.id],
    queryFn: () =>
      getCategoriesWithAvailableAmount({ designationId: activeDesignation.id }),
  });

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Transfer History"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
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
      <Content designationId={activeDesignation.id} />
    </div>
  );
}
