'use client';

import { notFound } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { PageHeader } from '@/components/page-header';

import { Content } from './content';

export default function TransfersPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

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
