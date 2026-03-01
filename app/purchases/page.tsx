'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';

import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

import { Content } from './content';

export default function PurchasesPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Purchases"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
      />
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        }
      >
        <Content designationId={activeDesignation.id} />
      </Suspense>
    </div>
  );
}
