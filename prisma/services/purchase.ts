'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Purchase, PurchaseWithUser } from '@/lib/types';
import { ErrorType, ResponseType } from '@/lib/utils';

export async function getLatestPurchases(
  limit: number = 10,
): Promise<PurchaseWithUser[]> {
  const purchases = await prisma.purchase.findMany({
    take: limit,
    orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
    include: { user: true },
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
  expenseReportCreated,
  reimbursed,
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
  expenseReportCreated?: boolean;
  reimbursed?: boolean;
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
          expenseReportCreated: expenseReportCreated ?? false,
          reimbursed: reimbursed ?? false,
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
        expenseReportCreated: expenseReportCreated ?? false,
        reimbursed: reimbursed ?? false,
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
  expenseReportCreated,
  reimbursed,
  notes,
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
  expenseReportCreated?: boolean;
  reimbursed?: boolean;
  notes?: string;
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

  const purchase = await prisma.purchase.update({
    where: { id },
    data: {
      userId,
      categoryId,
      description,
      amount: new Decimal(amount),
      allocationId: allocationId || null,
      purchasedAt,
      receipts,
      excludeFromTotal: excludeFromTotal ?? false,
      expenseReportCreated: expenseReportCreated ?? false,
      reimbursed: reimbursed ?? false,
      notes: notes ?? null,
      ...(yearId ? { yearId } : {}),
    },
  });

  revalidatePath('/');
  revalidatePath('/designation');

  return { ...purchase, amount: purchase.amount.toNumber() };
}

export async function deletePurchase(
  id: string,
): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.delete({ where: { id } });

  revalidatePath('/');
  revalidatePath('/designation');

  return { ...purchase, amount: purchase.amount.toNumber() };
}
