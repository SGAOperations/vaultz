'use server';

import { revalidatePath } from 'next/cache';

import { Prisma, ProcessStep, ProcessTemplate } from '@/prisma/client';

import prisma from '@/lib/prisma';
import {
  ProcessStepSequence,
  ProcessTemplateWithSequence,
  ProcessTemplateWithStepCount,
} from '@/lib/types';
import { ResponseType } from '@/lib/utils';

// Branch order is otherwise whatever the database happens to return, which lets
// the same template render "Branch 1" and "Branch 2" swapped between loads
const STEP_ORDER = [
  { createdAt: 'asc' },
  { id: 'asc' },
] satisfies Prisma.ProcessStepOrderByWithRelationInput[];

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

export async function getProcessTemplateAsSequence(
  id: string,
): Promise<ProcessTemplateWithSequence | null> {
  const template = await prisma.processTemplate.findUnique({
    where: { id },
    include: { steps: { where: { deletedAt: null }, orderBy: STEP_ORDER } },
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

// Every branch of a parent shares that parent's id in parentStepId, so a
// sibling set can hold several independent chains. This walks back to the head
// of the one chain `stepId` belongs to and then forward to its tail.
function chainContaining(steps: ProcessStep[], stepId: string): ProcessStep[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const byPrevious = new Map<string, ProcessStep>();
  for (const s of steps)
    if (s.previousStepId) byPrevious.set(s.previousStepId, s);

  let head = byId.get(stepId);
  if (!head) return [];

  const visited = new Set<string>([head.id]);
  while (head.previousStepId) {
    const previous = byId.get(head.previousStepId);
    if (!previous || visited.has(previous.id)) break;
    visited.add(previous.id);
    head = previous;
  }

  const chain: ProcessStep[] = [];
  const walked = new Set<string>();
  let current: ProcessStep | undefined = head;
  while (current && !walked.has(current.id)) {
    walked.add(current.id);
    chain.push(current);
    current = byPrevious.get(current.id);
  }
  return chain;
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
  const parentStepId = data.parentStepId ?? null;

  const step = await prisma.$transaction(async (tx) => {
    let previousStepId: string | null = null;
    let successorId: string | null = null;

    if (data.afterStepId) {
      previousStepId = data.afterStepId;
      // previousStepId is a plain unique index, so whoever currently points at
      // afterStepId has to release the slot before the new step can claim it
      const holder = await tx.processStep.findUnique({
        where: { previousStepId: data.afterStepId },
      });
      if (holder) {
        await tx.processStep.update({
          where: { id: holder.id },
          data: { previousStepId: null },
        });
        if (!holder.deletedAt) successorId = holder.id;
      }
    } else {
      // The `next` relation filter ignores deletedAt, so a soft-deleted
      // successor would still make its predecessor look like a non-tail
      const siblings = await tx.processStep.findMany({
        where: { templateId, deletedAt: null, parentStepId },
        orderBy: STEP_ORDER,
      });
      previousStepId = sortByLinkedList(siblings).at(-1)?.id ?? null;
    }

    const created = await tx.processStep.create({
      data: {
        templateId,
        name: data.name,
        description: data.description || null,
        previousStepId,
        parentStepId,
      },
    });

    if (successorId)
      await tx.processStep.update({
        where: { id: successorId },
        data: { previousStepId: created.id },
      });

    await tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
    return created;
  });
  revalidatePath(`/processes/${templateId}`);
  return step;
}

export async function addBranchStep(
  templateId: string,
  parentStepId: string,
  data: { name: string; description?: string },
): Promise<ResponseType<ProcessStep>> {
  const step = await prisma.$transaction(async (tx) => {
    const s = await tx.processStep.create({
      data: {
        templateId,
        name: data.name,
        description: data.description || null,
        previousStepId: null,
        parentStepId,
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
      const liveSteps = await tx.processStep.findMany({
        where: { templateId, deletedAt: null },
        select: { id: true, parentStepId: true },
      });

      // A branch exists only as a continuation of the step it hangs off, so it
      // goes with that step. Promoting it to the parent instead would drop a
      // second head into the parent sequence, which the renderer discards.
      const doomed = new Set([stepId]);
      for (let grew = true; grew; ) {
        grew = false;
        for (const s of liveSteps)
          if (
            s.parentStepId &&
            doomed.has(s.parentStepId) &&
            !doomed.has(s.id)
          ) {
            doomed.add(s.id);
            grew = true;
          }
      }

      const successor = await tx.processStep.findFirst({
        where: { previousStepId: stepId, deletedAt: null },
      });

      // Deleted rows keep occupying their unique previousStepId slot, so clear
      // it as part of the soft delete before handing it to the successor
      await tx.processStep.updateMany({
        where: { id: { in: [...doomed] } },
        data: { previousStepId: null, deletedAt: new Date() },
      });

      if (successor)
        await tx.processStep.update({
          where: { id: successor.id },
          data: { previousStepId: step.previousStepId },
        });
    }

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
    orderBy: STEP_ORDER,
  });

  // Siblings span every branch of the parent, so reordering has to stay inside
  // the single chain this step belongs to
  const sorted = chainContaining(siblings, stepId);
  const idx = sorted.findIndex((s) => s.id === stepId);
  if (idx === -1) return { error: 'Step not found' };
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length)
    return { error: 'Cannot move step' };

  const newOrder = [...sorted];
  [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

  const template = await prisma.$transaction(async (tx) => {
    // previousStepId is a plain, non-deferrable unique index. Writing the new
    // links one row at a time collides with the links still in place, so the
    // whole chain is released first and then rebuilt.
    await tx.processStep.updateMany({
      where: { id: { in: newOrder.map((s) => s.id) } },
      data: { previousStepId: null },
    });
    for (let i = 1; i < newOrder.length; i++)
      await tx.processStep.update({
        where: { id: newOrder[i].id },
        data: { previousStepId: newOrder[i - 1].id },
      });
    return tx.processTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
  });
  revalidatePath(`/processes/${templateId}`);
  return template;
}
