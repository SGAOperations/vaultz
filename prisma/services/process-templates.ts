'use server';

import { revalidatePath } from 'next/cache';

import { ProcessStep, ProcessTemplate } from '@/prisma/client';

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

export async function addProcessStep(
  templateId: string,
  data: { name: string; description?: string },
): Promise<ResponseType<ProcessStep>> {
  const step = await prisma.$transaction(async (tx) => {
    const maxStep = await tx.processStep.findFirst({
      where: { templateId, deletedAt: null },
      orderBy: { order: 'desc' },
    });
    const s = await tx.processStep.create({
      data: {
        templateId,
        name: data.name,
        description: data.description || null,
        order: maxStep ? maxStep.order + 1 : 0,
      },
    });
    await tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
    return s;
  });
  revalidatePath(`/processes/${templateId}`);
  revalidatePath('/processes');
  return step;
}

export async function updateProcessStep(
  stepId: string,
  templateId: string,
  data: { name: string; description?: string },
): Promise<ResponseType<ProcessStep>> {
  const step = await prisma.$transaction(async (tx) => {
    const s = await tx.processStep.update({
      where: { id: stepId },
      data: { name: data.name, description: data.description || null },
    });
    await tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
    return s;
  });
  revalidatePath(`/processes/${templateId}`);
  revalidatePath('/processes');
  return step;
}

export async function deleteProcessStep(
  stepId: string,
  templateId: string,
): Promise<ResponseType<ProcessTemplate>> {
  const template = await prisma.$transaction(async (tx) => {
    await tx.processStep.update({
      where: { id: stepId },
      data: { deletedAt: new Date() },
    });
    return tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
  });
  revalidatePath(`/processes/${templateId}`);
  revalidatePath('/processes');
  return template;
}

export async function moveProcessStep(
  templateId: string,
  stepId: string,
  direction: 'up' | 'down',
): Promise<ResponseType<ProcessTemplate>> {
  const steps = await prisma.processStep.findMany({
    where: { templateId, deletedAt: null },
    orderBy: { order: 'asc' },
  });
  const idx = steps.findIndex((s) => s.id === stepId);
  if (idx === -1) return { error: 'Step not found' };
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= steps.length) return { error: 'Cannot move step' };
  const newSteps = [...steps];
  [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
  const template = await prisma.$transaction(async (tx) => {
    for (let i = 0; i < newSteps.length; i++)
      await tx.processStep.update({ where: { id: newSteps[i].id }, data: { order: i } });
    return tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
  });
  revalidatePath(`/processes/${templateId}`);
  revalidatePath('/processes');
  return template;
}
