'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Transfer, TransferWithCategories } from '@/lib/types';
import { ErrorType, ResponseType } from '@/lib/utils';

export async function getTransfers(yearId?: string): Promise<TransferWithCategories[]> {
  const transfers = await prisma.transfer.findMany({
    where: {
      deletedAt: null,
      ...(yearId ? { yearId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      fromCategory: { include: { designation: true } },
      toCategory: { include: { designation: true } },
      year: true,
    },
  });

  return transfers.map(({ amount, ...v }) => ({
    ...v,
    amount: amount.toNumber(),
  }));
}

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
}): Promise<ResponseType<Transfer>> {
  const year = await prisma.year.findUnique({ where: { id: yearId, deletedAt: null } });
  if (!year)
    return { error: 'Selected year not found.' } satisfies ErrorType;

  const fromCategoryYear = await prisma.categoryYear.findFirst({
    where: { categoryId: fromCategoryId, yearId, deletedAt: null },
  });
  if (!fromCategoryYear)
    return {
      error: `The source category doesn't have a budget in ${year.name}. Please select a different category.`,
    } satisfies ErrorType;

  const toCategoryYear = await prisma.categoryYear.findFirst({
    where: { categoryId: toCategoryId, yearId, deletedAt: null },
  });
  if (!toCategoryYear)
    return {
      error: `The destination category doesn't have a budget in ${year.name}. Please select a different category.`,
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

  revalidatePath('/transfers');

  return { ...transfer, amount: transfer.amount.toNumber() };
}

export async function deleteTransfer(id: string): Promise<ResponseType<Transfer>> {
  const transfer = await prisma.transfer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/transfers');

  return { ...transfer, amount: transfer.amount.toNumber() };
}
