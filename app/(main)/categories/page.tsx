'use client';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';
import { Plus, Wallet } from 'lucide-react';

import { CategoryYearBudgetsDialog } from '@/components/category-year-budgets-dialog';
import { CreateCategoryDialog } from '@/components/create-category-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function CategoriesPage() {
  const { selectedDesignation } = useDesignation();
  const { selectedYear } = useYear();

  if (!selectedDesignation) return null;

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
            {selectedYear && (
              <CategoryYearBudgetsDialog
                designationId={selectedDesignation.id}
                yearId={selectedYear.id}
                yearName={selectedYear.name}
                budgetResetBehavior={selectedDesignation.budgetResetBehavior}
                trigger={
                  <Button size="sm" variant="outline">
                    <Wallet className="size-4" />
                    Set Budgets
                  </Button>
                }
              />
            )}
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
