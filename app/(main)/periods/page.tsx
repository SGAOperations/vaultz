import { Metadata } from 'next';

import { Plus } from 'lucide-react';

import { getYearsWithPeriods } from '@/prisma/services/period';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PeriodsAdminClient } from '@/components/periods-admin-client';
import { Button } from '@/components/ui/button';
import { YearDialog } from '@/components/year-dialog';

export const metadata: Metadata = { title: 'Periods' };

export default async function PeriodsAdminPage() {
  const years = await getYearsWithPeriods();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Years & Periods"
        description="Manage fiscal years and their sub-periods · Global"
        actions={
          <YearDialog>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add Year
            </Button>
          </YearDialog>
        }
      />

      {years.length === 0 ? (
        <EmptyState
          message="No years found"
          description="Add a fiscal year to get started"
        />
      ) : (
        <PeriodsAdminClient
          years={years}
          allPeriods={years.flatMap((y) => y.periods)}
        />
      )}
    </div>
  );
}
