import { getDesignations } from '@/prisma/services/designation';
import { getAllYears } from '@/prisma/services/period';

import { PageHeader } from '@/components/page-header';
import { YearComparisonReport } from '@/components/year-comparison-report';

export const metadata = { title: 'Year Comparison' };

export default async function YearComparisonPage() {
  const [years, designations] = await Promise.all([
    getAllYears(),
    getDesignations(),
  ]);

  // Default to the 3 most recent years
  const defaultYearIds = years.slice(0, 3).map((y) => y.id);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Year-Over-Year Comparison"
        description="Compare budget trends, spending patterns, and category performance across fiscal years"
      />
      <YearComparisonReport
        allYears={years.map((y) => ({ id: y.id, name: y.name }))}
        designations={designations.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
        }))}
        defaultYearIds={defaultYearIds}
      />
    </div>
  );
}
