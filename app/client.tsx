'use client';

import { useDesignation } from '@/contexts/DesignationContext';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

import { Content } from './content';

export function Client() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation)
    return (
      <div className="flex w-full flex-col">
        <PageHeader
          title="Dashboard"
          description="Select a designation to view its overview"
        />
        <EmptyState
          message="No designation selected"
          description="Create a designation to get started"
        />
      </div>
    );

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
