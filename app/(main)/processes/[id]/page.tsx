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
  // Use updatedAt as key so the component remounts (resetting local step state)
  // whenever the server confirms a step mutation via router.refresh()
  return <Content key={template.updatedAt.toISOString()} template={template} />;
}
