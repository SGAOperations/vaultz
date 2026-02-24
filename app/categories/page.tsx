'use client';

import { notFound } from 'next/navigation';

import { Plus } from 'lucide-react';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';

import { CategoryYearBudgetsDialog } from '@/components/category-year-budgets-dialog';
import { CategoryYearComparison } from '@/components/category-year-comparison';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Content } from './content';

export default function CategoriesPage() {
  const { activeDesignation } = useDesignation();
  const { years, selectedYear } = useYear();

  if (!activeDesignation) notFound();

  const sortedYears = [...years].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const prevYear = selectedYear
    ? sortedYears[sortedYears.findIndex((y) => y.id === selectedYear.id) - 1]
    : undefined;

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Categories"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
        actions={
          selectedYear ? (
            <CategoryYearBudgetsDialog
              trigger={
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" />
                  Set {selectedYear.name} Budgets
                </Button>
              }
              designationId={activeDesignation.id}
              yearId={selectedYear.id}
              yearName={selectedYear.name}
              budgetResetBehavior={activeDesignation.budgetResetBehavior}
              prevYearId={prevYear?.id}
              prevYearName={prevYear?.name}
            />
          ) : undefined
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            {selectedYear ? selectedYear.name : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="comparison">Year Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Content designationId={activeDesignation.id} />
        </TabsContent>

        <TabsContent value="comparison">
          <CategoryYearComparison designationId={activeDesignation.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
