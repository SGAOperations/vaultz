'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { Plus } from 'lucide-react';

import { CreateCategoryDialog } from '@/components/create-category-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function CategoriesPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Categories"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
        actions={
          <div className="flex gap-2">
            <CreateCategoryDialog
              designationId={activeDesignation.id}
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

      <Content designationId={activeDesignation.id} />
    </div>
  );
}
