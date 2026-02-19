'use client';

import { Suspense, useMemo } from 'react';

import { Designation } from '@/prisma/client';

import { getDashboardData } from '@/prisma/services/dashboard';

import { useDesignation } from '@/contexts/DesignationContext';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

import { Content } from './content';
import { PageSkeleton } from './skeleton';

type DashboardDataPromise = ReturnType<typeof getDashboardData>;

function DesignationDashboard({ designation }: { designation: Designation }) {
  const dataPromise: DashboardDataPromise = useMemo(
    () => getDashboardData(designation.id),
    [designation.id],
  );

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={designation.name}
        description={`Dashboard · DN${designation.code}`}
      />
      <Suspense fallback={<PageSkeleton />} key={designation.id}>
        <Content dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}

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

  return <DesignationDashboard designation={activeDesignation} />;
}
