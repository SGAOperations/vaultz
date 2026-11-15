import { Metadata } from 'next';

import { getDivisionFigures } from '@/prisma/services/division-figures';
import { getActiveYear, getAllYears } from '@/prisma/services/period';

import { DivisionFigures } from '@/lib/types';

import { DivisionCard } from '@/components/division-card';
import { DivisionYearPicker } from '@/components/division-year-picker';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';

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
          <DivisionYearPicker
            years={years.map((y) => ({ id: y.id, name: y.name }))}
            selectedYearId={selectedYear.id}
          />
        }
      />

      {divisions.length === 0 ? (
        <EmptyState
          message="No divisions visible to you"
          description="Ask an editor to assign your position to a division."
        />
      ) : (
        groupByDesignation(divisions).map(({ key, title, items }) => (
          <section key={key} className="flex flex-col">
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

// Rows arrive ordered by designation code, so consecutive rows share a group.
function groupByDesignation(divisions: DivisionFigures[]) {
  const groups: { key: string; title: string; items: DivisionFigures[] }[] = [];
  for (const division of divisions) {
    const last = groups.at(-1);
    if (last?.key === division.designationId) last.items.push(division);
    else
      groups.push({
        key: division.designationId,
        title: `DN${division.designationCode} · ${division.designationName}`,
        items: [division],
      });
  }
  return groups;
}
