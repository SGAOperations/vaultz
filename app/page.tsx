'use client';

import { notFound } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { PageHeader } from '@/components/page-header';

import { Content } from './content';

export default function Home() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={activeDesignation.name}
        description={`Dashboard · DN${activeDesignation.code}`}
      />
      <Content designationId={activeDesignation.id} />
    </div>
  );
}
