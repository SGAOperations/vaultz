'use client';

import { redirect } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { PageHeader } from '@/components/page-header';
import { QuickActionButtons } from '@/components/quick-action-buttons';

import { Content } from './content';

export default function Home() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) redirect('/designation');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={activeDesignation.name}
        description={`Dashboard · DN${activeDesignation.code}`}
        actions={<QuickActionButtons designationId={activeDesignation.id} />}
      />
      <Content designationId={activeDesignation.id} />
    </div>
  );
}
