'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { TransferWithYear } from '@/lib/types';
import { ErrorType, ResponseType } from '@/lib/utils';

export async function createTransfer({
  fromCategoryId,
  toCategoryId,
  amount,
  notes,
  yearId,
}: {
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  notes?: string;
  yearId: string;
}): Promise<ResponseType<{ id: string }>> {
  const year = await prisma.year.findFirst({
    where: { id: yearId, deletedAt: null },
  });
  if (!year)
    return { error: 'The selected year does not exist.' } satisfies ErrorType;

  const [fromCategoryYear, toCategoryYear] = await Promise.all([
    prisma.categoryYear.findFirst({
      where: { categoryId: fromCategoryId, yearId, deletedAt: null },
    }),
    prisma.categoryYear.findFirst({
      where: { categoryId: toCategoryId, yearId, deletedAt: null },
    }),
  ]);

  if (!fromCategoryYear || !toCategoryYear)
    return {
      error: `The selected categories don't have budgets in ${year.name}. Please select different categories.`,
    } satisfies ErrorType;

  const transfer = await prisma.transfer.create({
    data: {
      fromCategoryId,
      toCategoryId,
      amount: new Decimal(amount),
      notes: notes ?? null,
      yearId,
    },
  });

  revalidatePath('/designation');
  revalidatePath('/category');
  revalidatePath('/categories');

  return { id: transfer.id };
}

export async function getTransfersByCategory(
  categoryId: string,
): Promise<TransferWithYear[]> {
  const transfers = await prisma.transfer.findMany({
    where: {
      deletedAt: null,
      OR: [{ fromCategoryId: categoryId }, { toCategoryId: categoryId }],
    },
    include: { year: true, fromCategory: true, toCategory: true },
    orderBy: { createdAt: 'desc' },
  });

  return transfers.map(({ amount, ...t }) => ({
    ...t,
    amount: amount.toNumber(),
  }));
}
