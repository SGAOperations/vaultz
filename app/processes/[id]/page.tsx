import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProcessTemplate } from '@/prisma/services/process-templates';

import { Content } from './content';

export const metadata: Metadata = { title: 'Process Template' };

export default async function ProcessTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getProcessTemplate(id);
  if (!template) notFound();
  return <Content key={template.updatedAt.toISOString()} template={template} />;
}
