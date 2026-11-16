import { Metadata } from 'next';
import Link from 'next/link';

import { ShieldCheck } from 'lucide-react';

import { getDivisionFigures } from '@/prisma/services/division-figures';
import { getActiveYear, getAllYears } from '@/prisma/services/period';

import { groupByDesignation } from '@/lib/utils';

import { DivisionCard } from '@/components/division-card';
import { DivisionYearPicker } from '@/components/division-year-picker';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { EditOnly } from '@/components/providers/capabilities-provider';
import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Division Budgets' };

interface DivisionsPageProps {
  searchParams: Promise<{ year?: string | string[] }>;
}

export default async function DivisionsPage({
  searchParams,
}: DivisionsPageProps) {
  const [{ year }, years, activeYear] = await Promise.all([
    searchParams,
    getAllYears(),
    getActiveYear(),
  ]);

  if (years.length === 0)
    return (
      <div className="flex w-full flex-col">
        <PageHeader title="Division Budgets" />
        <EmptyState
          message="No fiscal years yet"
          description="Create a fiscal year to see division budgets."
        />
      </div>
    );

  const requestedYearId = Array.isArray(year) ? year[0] : year;
  const selectedYear =
    years.find((y) => y.id === requestedYearId) ??
    years.find((y) => y.id === activeYear?.id) ??
    years[0];

  const divisions = await getDivisionFigures(selectedYear.id);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Division Budgets"
        description={`Budget position for each division · ${selectedYear.name}`}
        actions={
          <>
            <DivisionYearPicker
              years={years.map((y) => ({ id: y.id, name: y.name }))}
              selectedYearId={selectedYear.id}
            />
            <EditOnly>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/divisions/access" aria-label="Manage access">
                  <ShieldCheck className="size-4" />
                  <span className="hidden sm:inline">Manage access</span>
                </Link>
              </Button>
            </EditOnly>
          </>
        }
      />

      {divisions.length === 0 ? (
        <EmptyState
          message="No divisions visible to you"
          description="Ask an editor to assign your position to a division."
        />
      ) : (
        groupByDesignation(divisions).map(({ designationId, title, items }) => (
          <section key={designationId} className="flex flex-col">
            <SectionHeader title={title} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((division) => (
                <DivisionCard
                  key={division.allocationGroupId}
                  division={division}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
