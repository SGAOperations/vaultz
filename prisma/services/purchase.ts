'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Purchase } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function createPurchase({
  userId,
  accountId,
  description,
  amount,
  allocationId,
  purchasedAt,
  receipts,
}: {
  userId: string;
  accountId: string;
  description?: string;
  amount: number;
  allocationId?: string;
  purchasedAt: Date;
  receipts?: string[];
}): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      accountId,
      description: description || '',
      amount: new Decimal(amount),
      allocationId,
      purchasedAt: purchasedAt,
      receipts,
    },
  });

  revalidatePath('/');

  return { ...purchase, amount: purchase.amount.toNumber() };
}
