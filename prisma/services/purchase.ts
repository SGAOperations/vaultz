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
  receipts,
}: {
  userId: string;
  accountId: string;
  description?: string;
  amount: number;
  allocationId?: string;
  receipts?: string[];
}): Promise<{ success: boolean; data?: Purchase; error?: string }> {
  try {
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        accountId,
        description: description || '',
        amount: new Decimal(amount),
        allocationId,
        receipts,
      },
    });

    revalidatePath('/');

    return { success: true, data: { ...purchase, amount: purchase.amount.toNumber() } };
  } catch (error) {
    console.error('Error creating purchase:', error);
    return { success: false, error: 'Failed to create purchase' };
  }
}
