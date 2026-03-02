'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { PageHeader } from '@/components/page-header';

import { Content } from './content';

export default function TransfersPage() {
  const { selectedDesignation } = useDesignation();

  if (!selectedDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Transfer History"
        description={`${selectedDesignation.name} · DN${selectedDesignation.code}`}
      />
      <Content designationId={selectedDesignation.id} />
    </div>
  );
}
