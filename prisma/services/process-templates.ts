'use server';

import { revalidatePath } from 'next/cache';

import { ProcessTemplate } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { ProcessTemplateWithStepCount, ProcessTemplateWithSteps } from '@/lib/types';
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

export async function getProcessTemplate(
  id: string,
): Promise<ProcessTemplateWithSteps | null> {
  return prisma.processTemplate.findUnique({
    where: { id },
    include: {
      steps: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
      },
    },
  });
}

export async function updateProcessTemplate(
  id: string,
  data: { name: string; description?: string },
): Promise<ResponseType<ProcessTemplate>> {
  const template = await prisma.processTemplate.update({
    where: { id },
    data: { name: data.name, description: data.description || null },
  });

  revalidatePath('/processes');
  revalidatePath(`/processes/${id}`);

  return template;
}

export async function softDeleteProcessTemplate(
  id: string,
): Promise<ResponseType<ProcessTemplate>> {
  const template = await prisma.processTemplate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/processes');
  revalidatePath(`/processes/${id}`);

  return template;
}

export async function restoreProcessTemplate(
  id: string,
): Promise<ResponseType<ProcessTemplate>> {
  const template = await prisma.processTemplate.update({
    where: { id },
    data: { deletedAt: null },
  });

  revalidatePath('/processes');
  revalidatePath(`/processes/${id}`);

  return template;
}

export async function saveProcessSteps(
  templateId: string,
  steps: { id?: string; name: string; description?: string; order: number }[],
  deletedStepIds: string[],
): Promise<ResponseType<void>> {
  try {
    await prisma.$transaction(async (tx) => {
      if (deletedStepIds.length > 0)
        await tx.processStep.updateMany({
          where: { id: { in: deletedStepIds } },
          data: { deletedAt: new Date() },
        });

      for (const step of steps) {
        if (step.id)
          await tx.processStep.update({
            where: { id: step.id },
            data: {
              name: step.name,
              description: step.description || null,
              order: step.order,
            },
          });
        else
          await tx.processStep.create({
            data: {
              templateId,
              name: step.name,
              description: step.description || null,
              order: step.order,
            },
          });
      }

      await tx.processTemplate.update({
        where: { id: templateId },
        data: { updatedAt: new Date() },
      });
    });

    revalidatePath(`/processes/${templateId}`);
    revalidatePath('/processes');
  } catch {
    return { error: 'Failed to save steps' };
  }
}
