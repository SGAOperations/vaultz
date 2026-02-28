'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BarChart2, Ellipsis, Plus } from 'lucide-react';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';

import { CategoryYearBudgetsDialog } from '@/components/category-year-budgets-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
          <div className="flex gap-2">
            {selectedYear && (
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
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/categories/comparison">
                    <BarChart2 className="size-4" />
                    Year Comparison
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Content designationId={activeDesignation.id} />
    </div>
  );
}
