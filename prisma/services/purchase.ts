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
    orderBy: { createdAt: 'desc' },
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
}: {
  userId: string;
  categoryId: string;
  description?: string;
  amount: number;
  allocationId?: string;
  purchasedAt: Date;
  receipts?: string[];
}): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      categoryId,
      description: description || '',
      amount: new Decimal(amount),
      allocationId,
      purchasedAt: purchasedAt,
      receipts,
    },
  });

  revalidatePath('/');
  revalidatePath('/index');

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
}: {
  id: string;
  userId: string;
  categoryId: string;
  description?: string;
  amount: number;
  allocationId?: string;
  purchasedAt: Date;
  receipts?: string[];
}): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.update({
    where: { id },
    data: {
      userId,
      categoryId,
      description: description || '',
      amount: new Decimal(amount),
      allocationId: allocationId || null,
      purchasedAt,
      receipts,
    },
  });

  revalidatePath('/');
  revalidatePath('/index');

  return { ...purchase, amount: purchase.amount.toNumber() };
}

export async function deletePurchase(
  id: string,
): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.delete({ where: { id } });

  revalidatePath('/');
  revalidatePath('/index');

  return { ...purchase, amount: purchase.amount.toNumber() };
}
