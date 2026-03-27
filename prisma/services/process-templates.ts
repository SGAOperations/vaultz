'use server';

import { revalidatePath } from 'next/cache';

import { ProcessStep, ProcessTemplate } from '@/prisma/client';

import prisma from '@/lib/prisma';
import {
  ProcessStepSequence,
  ProcessTemplateWithSequence,
  ProcessTemplateWithStepCount,
  ProcessTemplateWithSteps,
} from '@/lib/types';
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
    include: { steps: { where: { deletedAt: null } } },
  });
}

export async function getProcessTemplateAsSequence(
  id: string,
): Promise<ProcessTemplateWithSequence | null> {
  const template = await prisma.processTemplate.findUnique({
    where: { id },
    include: { steps: { where: { deletedAt: null } } },
  });

  if (!template) return null;

  return { ...template, rootSequence: buildSequence(template.steps, null) };
}

function sortByLinkedList(steps: ProcessStep[]): ProcessStep[] {
  const map = new Map(steps.map((s) => [s.id, s]));
  const result: ProcessStep[] = [];
  let current: ProcessStep | undefined = steps.find(
    (s) => !s.previousStepId || !map.has(s.previousStepId),
  );
  while (current) {
    result.push(current);
    const next = steps.find((s) => s.previousStepId === current!.id);
    current = next;
  }
  return result;
}

function buildSequence(
  allSteps: ProcessStep[],
  parentStepId: string | null,
): ProcessStepSequence {
  const siblings = allSteps.filter((s) => s.parentStepId === parentStepId);
  const sorted = sortByLinkedList(siblings);
  return sorted.map((step) => ({
    id: step.id,
    name: step.name,
    description: step.description,
    parentStepId: step.parentStepId,
    previousStepId: step.previousStepId,
    branches: buildBranches(allSteps, step.id),
  }));
}

function buildBranches(
  allSteps: ProcessStep[],
  parentStepId: string,
): ProcessStepSequence[] {
  const branchSteps = allSteps.filter((s) => s.parentStepId === parentStepId);
  if (branchSteps.length === 0) return [];

  const branchIds = new Set(branchSteps.map((s) => s.id));
  const branchStarts = branchSteps.filter(
    (s) => !s.previousStepId || !branchIds.has(s.previousStepId),
  );

  return branchStarts.map((start) => {
    const sequence: ProcessStepSequence = [];
    let current: ProcessStep | undefined = start;
    while (current) {
      sequence.push({
        id: current.id,
        name: current.name,
        description: current.description,
        parentStepId: current.parentStepId,
        previousStepId: current.previousStepId,
        branches: buildBranches(allSteps, current.id),
      });
      current = branchSteps.find((s) => s.previousStepId === current!.id);
    }
    return sequence;
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

  revalidatePath(`/processes/${id}`);

  return template;
}

export async function deleteProcessTemplate(
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
  data: {
    name: string;
    description?: string;
    parentStepId?: string;
    afterStepId?: string;
  },
): Promise<ResponseType<ProcessStep>> {
  const step = await prisma.$transaction(async (tx) => {
    let previousStepId: string | null;
    if (data.afterStepId) {
      previousStepId = data.afterStepId;
      // Re-link the step that was after afterStepId to point to the new step
      const successor = await tx.processStep.findFirst({
        where: { previousStepId: data.afterStepId, deletedAt: null },
      });
      const s = await tx.processStep.create({
        data: {
          templateId,
          name: data.name,
          description: data.description || null,
          previousStepId,
          parentStepId: data.parentStepId ?? null,
        },
      });
      if (successor)
        await tx.processStep.update({
          where: { id: successor.id },
          data: { previousStepId: s.id },
        });
      await tx.processTemplate.update({
        where: { id: templateId },
        data: { updatedAt: new Date() },
      });
      return s;
    }
    const lastStep = await tx.processStep.findFirst({
      where: {
        templateId,
        deletedAt: null,
        parentStepId: data.parentStepId ?? null,
        next: null,
      },
    });
    const s = await tx.processStep.create({
      data: {
        templateId,
        name: data.name,
        description: data.description || null,
        previousStepId: lastStep?.id ?? null,
        parentStepId: data.parentStepId ?? null,
      },
    });
    await tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
    return s;
  });
  revalidatePath(`/processes/${templateId}`);
  return step;
}

export async function addBranchStep(
  templateId: string,
  siblingStepId: string,
  data: { name: string; description?: string },
): Promise<ResponseType<ProcessStep>> {
  const sibling = await prisma.processStep.findUnique({
    where: { id: siblingStepId },
  });
  if (!sibling) return { error: 'Step not found' };

  const step = await prisma.$transaction(async (tx) => {
    const lastSibling = await tx.processStep.findFirst({
      where: {
        templateId,
        deletedAt: null,
        parentStepId: sibling.parentStepId,
        next: null,
      },
    });
    const s = await tx.processStep.create({
      data: {
        templateId,
        name: data.name,
        description: data.description || null,
        previousStepId: lastSibling?.id ?? null,
        parentStepId: sibling.parentStepId,
      },
    });
    await tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
    return s;
  });
  revalidatePath(`/processes/${templateId}`);
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
  return step;
}

export async function deleteProcessStep(
  stepId: string,
  templateId: string,
): Promise<ResponseType<ProcessTemplate>> {
  const template = await prisma.$transaction(async (tx) => {
    const step = await tx.processStep.findUnique({ where: { id: stepId } });
    if (step) {
      // Re-link successor to point to deleted step's predecessor
      await tx.processStep.updateMany({
        where: { previousStepId: stepId, deletedAt: null },
        data: { previousStepId: step.previousStepId },
      });
      // Re-parent children to the deleted step's parent
      await tx.processStep.updateMany({
        where: { parentStepId: stepId, deletedAt: null },
        data: { parentStepId: step.parentStepId },
      });
    }
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
  return template;
}

export async function moveProcessStep(
  templateId: string,
  stepId: string,
  direction: 'up' | 'down',
): Promise<ResponseType<ProcessTemplate>> {
  const step = await prisma.processStep.findUnique({ where: { id: stepId } });
  if (!step) return { error: 'Step not found' };

  const siblings = await prisma.processStep.findMany({
    where: { templateId, parentStepId: step.parentStepId, deletedAt: null },
  });

  const sorted = sortByLinkedList(siblings);
  const idx = sorted.findIndex((s) => s.id === stepId);
  if (idx === -1) return { error: 'Step not found' };
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length)
    return { error: 'Cannot move step' };

  const newOrder = [...sorted];
  [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

  const minIdx = Math.min(idx, swapIdx);
  const maxIdx = Math.min(Math.max(idx, swapIdx) + 1, newOrder.length - 1);

  const template = await prisma.$transaction(async (tx) => {
    for (let i = minIdx; i <= maxIdx; i++)
      await tx.processStep.update({
        where: { id: newOrder[i].id },
        data: { previousStepId: i === 0 ? null : newOrder[i - 1].id },
      });
    return tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
  });
  revalidatePath(`/processes/${templateId}`);
  return template;
}
