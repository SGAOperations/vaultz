'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Transfer } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function createTransfer({
  fromCategoryId,
  toCategoryId,
  fromAllocationId,
  toAllocationId,
  amount,
  description,
}: {
  fromCategoryId?: string;
  toCategoryId?: string;
  fromAllocationId?: string;
  toAllocationId?: string;
  amount: number;
  description: string;
}): Promise<ResponseType<Transfer>> {
  // Validate that we have exactly one source and one destination
  const sources = [fromCategoryId, fromAllocationId].filter(Boolean);
  const destinations = [toCategoryId, toAllocationId].filter(Boolean);

  if (sources.length !== 1 || destinations.length !== 1) {
    throw new Error('Must specify exactly one source and one destination');
  }

  // Validate that source and destination are different
  if (
    (fromCategoryId && fromCategoryId === toCategoryId) ||
    (fromAllocationId && fromAllocationId === toAllocationId)
  ) {
    throw new Error('Source and destination must be different');
  }

  const transferAmount = new Decimal(amount);

  // Start a transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Deduct from source
    if (fromCategoryId) {
      const category = await tx.category.findUnique({
        where: { id: fromCategoryId },
      });
      if (!category) throw new Error('Source category not found');
      if (category.amount.lessThan(transferAmount)) {
        throw new Error('Insufficient funds in source category');
      }
      await tx.category.update({
        where: { id: fromCategoryId },
        data: { amount: category.amount.minus(transferAmount) },
      });
    } else if (fromAllocationId) {
      const allocation = await tx.allocation.findUnique({
        where: { id: fromAllocationId },
      });
      if (!allocation) throw new Error('Source allocation not found');
      if (allocation.amount.lessThan(transferAmount)) {
        throw new Error('Insufficient funds in source allocation');
      }
      await tx.allocation.update({
        where: { id: fromAllocationId },
        data: { amount: allocation.amount.minus(transferAmount) },
      });
    }

    // Add to destination
    if (toCategoryId) {
      const category = await tx.category.findUnique({
        where: { id: toCategoryId },
      });
      if (!category) throw new Error('Destination category not found');
      await tx.category.update({
        where: { id: toCategoryId },
        data: { amount: category.amount.plus(transferAmount) },
      });
    } else if (toAllocationId) {
      const allocation = await tx.allocation.findUnique({
        where: { id: toAllocationId },
      });
      if (!allocation) throw new Error('Destination allocation not found');
      await tx.allocation.update({
        where: { id: toAllocationId },
        data: { amount: allocation.amount.plus(transferAmount) },
      });
    }

    // Create transfer record
    const transfer = await tx.transfer.create({
      data: {
        fromCategoryId: fromCategoryId || null,
        toCategoryId: toCategoryId || null,
        fromAllocationId: fromAllocationId || null,
        toAllocationId: toAllocationId || null,
        amount: transferAmount,
        description,
      },
    });

    return transfer;
  });

  revalidatePath('/');
  revalidatePath('/transfers');
  revalidatePath('/designation');
  revalidatePath('/allocation-groups');

  return { ...result, amount: result.amount.toNumber() };
}

export async function getAllTransfers(): Promise<Transfer[]> {
  const transfers = await prisma.transfer.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fromCategory: { include: { designation: true } },
      toCategory: { include: { designation: true } },
      fromAllocation: true,
      toAllocation: true,
    },
  });

  return transfers.map((transfer) => ({
    ...transfer,
    amount: transfer.amount.toNumber(),
    fromCategory: transfer.fromCategory
      ? {
          ...transfer.fromCategory,
          amount: transfer.fromCategory.amount.toNumber(),
        }
      : null,
    toCategory: transfer.toCategory
      ? {
          ...transfer.toCategory,
          amount: transfer.toCategory.amount.toNumber(),
        }
      : null,
    fromAllocation: transfer.fromAllocation
      ? {
          ...transfer.fromAllocation,
          amount: transfer.fromAllocation.amount.toNumber(),
        }
      : null,
    toAllocation: transfer.toAllocation
      ? {
          ...transfer.toAllocation,
          amount: transfer.toAllocation.amount.toNumber(),
        }
      : null,
  }));
}

export async function getTransferById({
  id,
}: {
  id: string;
}): Promise<Transfer | null> {
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      fromCategory: { include: { designation: true } },
      toCategory: { include: { designation: true } },
      fromAllocation: true,
      toAllocation: true,
    },
  });

  if (!transfer) return null;

  return {
    ...transfer,
    amount: transfer.amount.toNumber(),
    fromCategory: transfer.fromCategory
      ? {
          ...transfer.fromCategory,
          amount: transfer.fromCategory.amount.toNumber(),
        }
      : null,
    toCategory: transfer.toCategory
      ? {
          ...transfer.toCategory,
          amount: transfer.toCategory.amount.toNumber(),
        }
      : null,
    fromAllocation: transfer.fromAllocation
      ? {
          ...transfer.fromAllocation,
          amount: transfer.fromAllocation.amount.toNumber(),
        }
      : null,
    toAllocation: transfer.toAllocation
      ? {
          ...transfer.toAllocation,
          amount: transfer.toAllocation.amount.toNumber(),
        }
      : null,
  };
}
