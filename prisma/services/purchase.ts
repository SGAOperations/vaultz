'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/client';

import prisma from '@/lib/prisma';
import { Purchase, PurchaseProcessData, PurchaseWithUser } from '@/lib/types';
import { ErrorType, ResponseType } from '@/lib/utils';

export async function getLatestPurchases(
  limit: number = 10,
): Promise<PurchaseWithUser[]> {
  const purchases = await prisma.purchase.findMany({
    take: limit,
    where: { deletedAt: null },
    orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
    include: { user: true, process: { select: { templateId: true } } },
  });

  return purchases.map(({ amount, ...v }) => ({
    ...v,
    amount: amount.toNumber(),
  }));
}

export async function getPurchasesByDesignation({
  designationId,
  yearId,
}: {
  designationId: string;
  yearId: string;
}): Promise<PurchaseWithUser[]> {
  const purchases = await prisma.purchase.findMany({
    where: {
      yearId,
      deletedAt: null,
      category: { designationId, deletedAt: null },
    },
    orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
    include: { user: true, process: { select: { templateId: true } } },
  });

  return purchases.map(({ amount, ...v }) => ({
    ...v,
    amount: amount.toNumber(),
  }));
}

export async function createPurchase({
  userId,
  categoryId,
  description,
  amount,
  allocationId,
  purchasedAt,
  receipts,
  excludeFromTotal,
  notes,
  yearId,
  processTemplateId,
}: {
  userId: string;
  categoryId: string;
  description: string;
  amount: number;
  allocationId?: string;
  purchasedAt: Date;
  receipts?: string[];
  excludeFromTotal?: boolean;
  notes?: string;
  yearId: string;
  processTemplateId?: string;
}): Promise<ResponseType<Purchase>> {
  const year = await prisma.year.findUnique({
    where: { id: yearId, deletedAt: null },
  });
  if (!year)
    return {
      error: 'The selected fiscal year does not exist.',
    } satisfies ErrorType;

  const resolvedYearId = yearId;

  const now = new Date();

  let purchase;
  if (processTemplateId) {
    purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          userId,
          categoryId,
          description,
          amount: new Decimal(amount),
          allocationId: allocationId || null,
          purchasedAt: purchasedAt,
          receipts,
          excludeFromTotal: excludeFromTotal ?? false,
          notes: notes ?? null,
          yearId: resolvedYearId,
        },
      });

      await tx.purchaseProcess.create({
        data: {
          purchaseId: p.id,
          templateId: processTemplateId,
          startedAt: now,
        },
      });

      return p;
    });
  } else {
    purchase = await prisma.purchase.create({
      data: {
        userId,
        categoryId,
        description,
        amount: new Decimal(amount),
        allocationId: allocationId || null,
        purchasedAt: purchasedAt,
        receipts,
        excludeFromTotal: excludeFromTotal ?? false,
        notes: notes ?? null,
        yearId: resolvedYearId,
      },
    });
  }

  revalidatePath('/');
  revalidatePath('/designation');

  return { ...purchase, amount: purchase.amount.toNumber() };
}

export async function updatePurchase({
  id,
  userId,
  categoryId,
  description,
  amount,
  allocationId,
  purchasedAt,
  receipts,
  excludeFromTotal,
  notes,
  processTemplateId,
  yearId,
}: {
  id: string;
  userId: string;
  categoryId: string;
  description: string;
  amount: number;
  allocationId?: string;
  purchasedAt: Date;
  receipts?: string[];
  excludeFromTotal?: boolean;
  notes?: string;
  processTemplateId?: string;
  yearId?: string;
}): Promise<ResponseType<Purchase>> {
  if (yearId) {
    const year = await prisma.year.findUnique({
      where: { id: yearId, deletedAt: null },
    });
    if (!year)
      return {
        error: 'The selected fiscal year does not exist.',
      } satisfies ErrorType;
  }

  const now = new Date();
  const updateData = {
    userId,
    categoryId,
    description,
    amount: new Decimal(amount),
    allocationId: allocationId || null,
    purchasedAt,
    receipts,
    excludeFromTotal: excludeFromTotal ?? false,
    notes: notes ?? null,
    ...(yearId ? { yearId } : {}),
  };

  let purchase;
  if (processTemplateId) {
    purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.update({ where: { id }, data: updateData });

      await tx.purchaseProcess.upsert({
        where: { purchaseId: id },
        create: {
          purchaseId: id,
          templateId: processTemplateId,
          startedAt: now,
        },
        update: { templateId: processTemplateId, updatedAt: now },
      });

      return p;
    });
  } else {
    purchase = await prisma.purchase.update({
      where: { id },
      data: updateData,
    });
  }

  revalidatePath('/');
  revalidatePath('/designation');

  return { ...purchase, amount: purchase.amount.toNumber() };
}

export async function deletePurchase(
  id: string,
): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/');
  revalidatePath('/designation');

  return { ...purchase, amount: purchase.amount.toNumber() };
}

export async function getPurchaseProcess(
  purchaseId: string,
): Promise<PurchaseProcessData | null> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId, deletedAt: null },
    include: {
      process: {
        include: {
          template: {
            include: {
              steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
            },
          },
          completions: { where: { deletedAt: null }, include: { step: true } },
        },
      },
    },
  });

  if (!purchase?.process) return null;

  const { process } = purchase;
  const steps = process.template.steps.map((step) => {
    const completion = process.completions.find((c) => c.stepId === step.id);
    return {
      id: step.id,
      name: step.name,
      order: step.order,
      completion: completion
        ? {
            id: completion.id,
            markedAt: completion.markedAt,
            completionDate: completion.completionDate,
            notes: completion.notes,
          }
        : null,
    };
  });

  return {
    processId: process.id,
    templateId: process.templateId,
    templateName: process.template.name,
    steps,
  };
}

export async function markStepComplete(
  purchaseProcessId: string,
  stepId: string,
  options?: { completionDate?: Date | null; notes?: string | null },
): Promise<ResponseType<{ id: string }>> {
  const existing = await prisma.purchaseStepCompletion.findFirst({
    where: { purchaseProcessId, stepId, deletedAt: null },
  });

  if (existing) return { error: 'Step is already marked as complete.' };

  const completion = await prisma.purchaseStepCompletion.create({
    data: {
      purchaseProcessId,
      stepId,
      markedAt: new Date(),
      completed: true,
      completionDate: options?.completionDate ?? null,
      notes: options?.notes ?? null,
    },
  });

  revalidatePath('/');

  return { id: completion.id };
}

export async function unmarkStepComplete(
  completionId: string,
): Promise<ResponseType<{ id: string }>> {
  const completion = await prisma.purchaseStepCompletion.findUnique({
    where: { id: completionId },
  });

  if (!completion || completion.deletedAt)
    return { error: 'Completion record not found.' };

  await prisma.purchaseStepCompletion.update({
    where: { id: completionId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/');

  return { id: completionId };
}

export async function getBatchPurchaseProcessData(
  purchaseIds: string[],
): Promise<Record<string, PurchaseProcessData | null>> {
  if (purchaseIds.length === 0) return {};

  const purchases = await prisma.purchase.findMany({
    where: { id: { in: purchaseIds }, deletedAt: null },
    select: {
      id: true,
      process: {
        include: {
          template: {
            include: {
              steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
            },
          },
          completions: { where: { deletedAt: null } },
        },
      },
    },
  });

  const result: Record<string, PurchaseProcessData | null> = {};

  for (const purchase of purchases) {
    if (!purchase.process) {
      result[purchase.id] = null;
      continue;
    }
    const { process } = purchase;
    const steps = process.template.steps.map((step) => {
      const completion = process.completions.find((c) => c.stepId === step.id);
      return {
        id: step.id,
        name: step.name,
        order: step.order,
        completion: completion
          ? {
              id: completion.id,
              markedAt: completion.markedAt,
              completionDate: completion.completionDate,
              notes: completion.notes,
            }
          : null,
      };
    });
    result[purchase.id] = {
      processId: process.id,
      templateId: process.templateId,
      templateName: process.template.name,
      steps,
    };
  }

  for (const id of purchaseIds) if (!(id in result)) result[id] = null;

  return result;
}
