'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { PurchaseStep } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getPurchaseSteps(
  purchaseId: string,
): Promise<PurchaseStep[]> {
  const steps = await prisma.purchaseStep.findMany({
    where: { purchaseId },
    orderBy: { order: 'asc' },
  });

  return steps;
}

export async function createPurchaseStep({
  purchaseId,
  name,
  order,
  completedAt,
  skipped,
}: {
  purchaseId: string;
  name: string;
  order: number;
  completedAt?: Date;
  skipped?: boolean;
}): Promise<ResponseType<PurchaseStep>> {
  const step = await prisma.purchaseStep.create({
    data: {
      purchaseId,
      name,
      order,
      completedAt: completedAt ?? null,
      skipped: skipped ?? false,
    },
  });

  revalidatePath('/');

  return step;
}

export async function updatePurchaseStep({
  id,
  name,
  order,
  completedAt,
  skipped,
}: {
  id: string;
  name?: string;
  order?: number;
  completedAt?: Date | null;
  skipped?: boolean;
}): Promise<ResponseType<PurchaseStep>> {
  const step = await prisma.purchaseStep.update({
    where: { id },
    data: {
      name,
      order,
      completedAt: completedAt !== undefined ? completedAt : undefined,
      skipped,
    },
  });

  revalidatePath('/');

  return step;
}

export async function deletePurchaseStep(
  id: string,
): Promise<ResponseType<PurchaseStep>> {
  const step = await prisma.purchaseStep.delete({ where: { id } });

  revalidatePath('/');

  return step;
}

export async function togglePurchaseStepComplete(
  id: string,
): Promise<ResponseType<PurchaseStep>> {
  const step = await prisma.purchaseStep.findUnique({ where: { id } });
  if (!step) {
    throw new Error('Step not found');
  }

  const updated = await prisma.purchaseStep.update({
    where: { id },
    data: {
      completedAt: step.completedAt ? null : new Date(),
      skipped: false, // Unmark skipped if completing
    },
  });

  revalidatePath('/');

  return updated;
}

export async function togglePurchaseStepSkipped(
  id: string,
): Promise<ResponseType<PurchaseStep>> {
  const step = await prisma.purchaseStep.findUnique({ where: { id } });
  if (!step) {
    throw new Error('Step not found');
  }

  const updated = await prisma.purchaseStep.update({
    where: { id },
    data: {
      skipped: !step.skipped,
      completedAt: step.skipped ? null : step.completedAt, // Keep completedAt if un-skipping
    },
  });

  revalidatePath('/');

  return updated;
}

export async function bulkUpdatePurchaseSteps({
  purchaseId,
  steps,
}: {
  purchaseId: string;
  steps: { id?: string; name: string; order: number }[];
}): Promise<ResponseType<PurchaseStep[]>> {
  // Delete steps that are not in the new list
  const stepIds = steps.filter((s) => s.id).map((s) => s.id!);
  await prisma.purchaseStep.deleteMany({
    where: { purchaseId, id: { notIn: stepIds } },
  });

  // Update or create steps
  const results = [];
  for (const step of steps) {
    if (step.id) {
      const updated = await prisma.purchaseStep.update({
        where: { id: step.id },
        data: { name: step.name, order: step.order },
      });
      results.push(updated);
    } else {
      const created = await prisma.purchaseStep.create({
        data: { purchaseId, name: step.name, order: step.order },
      });
      results.push(created);
    }
  }

  revalidatePath('/');

  return results;
}
