'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { ErrorType, ResponseType } from '@/lib/utils';

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
  const year = await prisma.year.findFirst({
    where: { deletedAt: null },
    orderBy: { startDate: 'desc' },
  });
  if (!year)
    return {
      error:
        'No active fiscal year found. Please create a year before transferring funds.',
    } satisfies ErrorType;

  const transfer = await prisma.transfer.create({
    data: {
      fromCategoryId,
      toCategoryId,
      amount: new Decimal(amount),
      notes: notes ?? null,
      yearId: year.id,
    },
  });

  revalidatePath('/designation');
  revalidatePath('/category');

  return { id: transfer.id };
}
