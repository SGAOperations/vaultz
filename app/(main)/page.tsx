'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';

import { PageHeader } from '@/components/page-header';
import { QuickActionButtons } from '@/components/quick-action-buttons';

import { Content } from './content';

export default function Home() {
  const { selectedYear } = useYear();
  const { selectedDesignation } = useDesignation();

  if (!selectedDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={selectedDesignation.name}
        description={`Dashboard · DN${selectedDesignation.code}${selectedYear ? ` · ${selectedYear.name}` : ''}`}
        actions={<QuickActionButtons designationId={selectedDesignation.id} />}
      />
      <Content designationId={selectedDesignation.id} />
    </div>
  );
}
