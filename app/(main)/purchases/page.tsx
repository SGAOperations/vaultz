'use client';

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';

import { Skeleton } from '@/components/ui/skeleton';

import { Content } from './content';

export default function PurchasesPage() {
  const { selectedDesignation } = useDesignation();

  if (!selectedDesignation) redirect('/designation');

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
        designationId={selectedDesignation.id}
        designationName={`${selectedDesignation.name} · DN${selectedDesignation.code}`}
      />
    </Suspense>
  );
}
