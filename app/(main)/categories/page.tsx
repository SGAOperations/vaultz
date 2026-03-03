'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';
import { Plus } from 'lucide-react';

import { CreateCategoryDialog } from '@/components/create-category-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function CategoriesPage() {
  const { selectedDesignation } = useDesignation();
  const { selectedYear } = useYear();

  if (!selectedDesignation) redirect('/designation');

  const description = selectedYear
    ? `${selectedDesignation.name} · DN${selectedDesignation.code} · ${selectedYear.name}`
    : `${selectedDesignation.name} · DN${selectedDesignation.code}`;

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Categories"
        description={description}
        actions={
          <div className="flex gap-2">
            <CreateCategoryDialog
              designationId={selectedDesignation.id}
              yearId={selectedYear?.id}
              yearName={selectedYear?.name}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New Category
                </Button>
              }
            />
          </div>
        }
      />

      <Content designationId={selectedDesignation.id} />
    </div>
  );
}
