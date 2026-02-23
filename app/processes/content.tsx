'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getAllProcessTemplates } from '@/prisma/services/process-templates';

import { EmptyState } from '@/components/empty-state';
import { ProcessTemplateCard } from '@/components/process-template-card';
import { Button } from '@/components/ui/button';

import { ProcessTemplatesSkeleton } from './skeleton';

export function Content() {
  const [activeOnly, setActiveOnly] = useState(false);

  const {
    data: templates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['process-templates', activeOnly],
    queryFn: () => getAllProcessTemplates(activeOnly),
  });

  if (isLoading) return <ProcessTemplatesSkeleton />;

  if (isError) return <EmptyState message="Failed to load process templates" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant={activeOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveOnly((v) => !v)}
        >
          {activeOnly ? 'Show All' : 'Active Only'}
        </Button>
      </div>

      {templates!.length === 0 ? (
        <EmptyState
          message="No process templates yet"
          description="Create your first process template to get started"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {templates!.map((template) => (
            <ProcessTemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
