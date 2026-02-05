'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

export async function transferFunds({
  fromCategoryId,
  toCategoryId,
  fromAllocationId,
  toAllocationId,
  amount,
}: {
  fromCategoryId?: string;
  toCategoryId?: string;
  fromAllocationId?: string;
  toAllocationId?: string;
  amount: number;
}): Promise<ResponseType<void>> {
  try {
    // Validate that we have exactly one source and one destination
    const sources = [fromCategoryId, fromAllocationId].filter(Boolean);
    const destinations = [toCategoryId, toAllocationId].filter(Boolean);

    if (sources.length !== 1 || destinations.length !== 1) {
      return { error: 'Must specify exactly one source and one destination' };
    }

    // Validate that source and destination are of the same type
    if (
      (fromCategoryId && !toCategoryId) ||
      (!fromCategoryId && toCategoryId)
    ) {
      return {
        error:
          'Transfers must be between accounts of the same type (category to category or allocation to allocation)',
      };
    }

    // Validate that source and destination are different
    if (
      (fromCategoryId && fromCategoryId === toCategoryId) ||
      (fromAllocationId && fromAllocationId === toAllocationId)
    ) {
      return { error: 'Source and destination must be different' };
    }

    const transferAmount = new Decimal(amount);

    // Start a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
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
    });

    // Revalidate paths (don't let revalidation errors affect the transfer result)
    try {
      revalidatePath('/');
      revalidatePath('/designation');
      revalidatePath('/allocation-groups');
      revalidatePath('/category');
      revalidatePath('/allocations');
    } catch (revalidateError) {
      // Log revalidation errors but don't fail the transfer
      console.error('Error revalidating paths:', revalidateError);
    }

    return undefined;
  } catch (error) {
    // Return error instead of throwing
    return {
      error:
        error instanceof Error ? error.message : 'Failed to transfer funds',
    };
  }
}
