'use server';

import prisma from '@/lib/prisma';
import { Purchase } from '@/lib/types';
import { Decimal } from '@/prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';

export async function createPurchase({
  userId,
  accountId,
  description,
  amount,
}: {
  userId: string;
  accountId: string;
  description?: string;
  amount: number;
}): Promise<Purchase> {
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      accountId,
      description: description || '',
      amount: new Decimal(amount),
    },
  });

  revalidatePath('/index')

  return { ...purchase, amount: purchase.amount.toNumber() };
}
