'use client';

import { notFound } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { CategoryYearComparison } from '@/components/category-year-comparison';
import { PageHeader } from '@/components/page-header';

export default function CategoryComparisonPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Year Comparison"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
      />
      <CategoryYearComparison designationId={activeDesignation.id} />
    </div>
  );
}
