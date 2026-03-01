'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { PageHeader } from '@/components/page-header';

import { Content } from './content';

export default function TransfersPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Transfer History"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
      />
      <Content designationId={activeDesignation.id} />
    </div>
  );
}
