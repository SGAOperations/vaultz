'use server';

import { revalidatePath } from 'next/cache';

import { ProcessTemplate } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { ProcessTemplateWithStepCount } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getAllProcessTemplates(
  activeOnly = false,
): Promise<ProcessTemplateWithStepCount[]> {
  const templates = await prisma.processTemplate.findMany({
    where: activeOnly ? { deletedAt: null } : undefined,
    include: { _count: { select: { steps: { where: { deletedAt: null } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return templates.map(({ _count, ...t }) => ({ ...t, steps: _count.steps }));
}

export async function createProcessTemplate(data: {
  name: string;
  description?: string;
}): Promise<ResponseType<ProcessTemplate>> {
  const template = await prisma.processTemplate.create({
    data: { name: data.name, description: data.description || null },
  });

  revalidatePath('/processes');

  return template;
}
