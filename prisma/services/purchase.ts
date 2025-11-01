'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Purchase } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

/**
 * Creates a new purchase record
 * @param purchasedAt - Date string in ISO format (YYYY-MM-DD) representing the purchase date
 */
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
  purchasedAt: string;
  receipts?: string[];
}): Promise<ResponseType<Purchase>> {
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      accountId,
      description: description || '',
      amount: new Decimal(amount),
      allocationId,
      purchasedAt: new Date(purchasedAt),
      receipts,
    },
  });

  revalidatePath('/');

  return { ...purchase, amount: purchase.amount.toNumber() };
}
