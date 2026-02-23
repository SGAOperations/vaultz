'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

export async function createTransfer({
  fromCategoryId,
  toCategoryId,
  amount,
  notes,
}: {
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  notes?: string;
}): Promise<ResponseType<{ id: string }>> {
  const transfer = await prisma.transfer.create({
    data: {
      fromCategoryId,
      toCategoryId,
      amount: new Decimal(amount),
      notes: notes ?? null,
    },
  });

  revalidatePath('/designation');
  revalidatePath('/category');

  return { id: transfer.id };
}
