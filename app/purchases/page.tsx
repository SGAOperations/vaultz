'use client';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';

import { Skeleton } from '@/components/ui/skeleton';

import { Content } from './content';

export default function PurchasesPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      }
    >
      <Content
        designationId={activeDesignation.id}
        designationName={`${activeDesignation.name} · DN${activeDesignation.code}`}
      />
    </Suspense>
  );
}
