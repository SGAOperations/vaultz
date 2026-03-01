'use client';

import { useQuery } from '@tanstack/react-query';

import { getAllProcessTemplates } from '@/prisma/services/process-templates';

import { EmptyState } from '@/components/empty-state';
import { ProcessTemplateCard } from '@/components/process-template-card';

import { ProcessTemplatesSkeleton } from './skeleton';

export function Content() {
  const {
    data: templates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['process-templates'],
    queryFn: () => getAllProcessTemplates(),
  });

  if (isLoading) return <ProcessTemplatesSkeleton />;

  if (isError) return <EmptyState message="Failed to load process templates" />;

  return templates!.length === 0 ? (
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
  );
}
