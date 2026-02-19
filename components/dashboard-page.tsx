'use client';

import { Suspense } from 'react';

import { Designation } from '@/prisma/client';

import { useDesignation } from '@/contexts/DesignationContext';

import { DashboardContent } from '@/components/dashboard-content';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

function DesignationDashboard({ designation }: { designation: Designation }) {
  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={designation.name}
        description={`Dashboard · DN${designation.code}`}
      />
      <Suspense fallback={<DashboardSkeleton />} key={designation.id}>
        <DashboardContent designationId={designation.id} />
      </Suspense>
    </div>
  );
}

export function DashboardPage() {
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

  return <DesignationDashboard designation={activeDesignation} />;
}
