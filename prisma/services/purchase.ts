'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Purchase } from '@/lib/types';

export async function createPurchase({
  userId,
  accountId,
  description,
  amount,
  allocationId,
}: {
  userId: string;
  accountId: string;
  description?: string;
  amount: number;
  allocationId?: string;
}): Promise<Purchase> {
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      accountId,
      description: description || '',
      amount: new Decimal(amount),
      allocationId,
    },
  });

  revalidatePath('/');

  return { ...purchase, amount: purchase.amount.toNumber() };
}
