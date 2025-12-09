'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Purchase, PurchaseWithUser } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

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
}): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.create({
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
    },
  });

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
}): Promise<ResponseType<Purchase>> {
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

export async function bulkUpdatePurchases({
  ids,
  excludeFromTotal,
  expenseReportCreated,
  reimbursed,
  purchasedAt,
}: {
  ids: string[];
  excludeFromTotal?: boolean;
  expenseReportCreated?: boolean;
  reimbursed?: boolean;
  purchasedAt?: Date;
}): Promise<{ count: number }> {
  const data: {
    excludeFromTotal?: boolean;
    expenseReportCreated?: boolean;
    reimbursed?: boolean;
    purchasedAt?: Date;
  } = {};

  if (excludeFromTotal !== undefined) data.excludeFromTotal = excludeFromTotal;
  if (expenseReportCreated !== undefined)
    data.expenseReportCreated = expenseReportCreated;
  if (reimbursed !== undefined) data.reimbursed = reimbursed;
  if (purchasedAt !== undefined) data.purchasedAt = purchasedAt;

  const result = await prisma.purchase.updateMany({
    where: { id: { in: ids } },
    data,
  });

  revalidatePath('/', 'layout');

  return { count: result.count };
}
