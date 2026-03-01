'use client';

import { notFound } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { CreateCategoryDialog } from '@/components/create-category-dialog';
import { PageHeader } from '@/components/page-header';

import { Plus } from 'lucide-react';

import { Content } from './content';

export default function CategoriesPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

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
        }
      />

      <Content designationId={activeDesignation.id} />
    </div>
  );
}
