'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { Allocation, AllocationWithPurchases } from '@/lib/types';
import { ErrorType, ResponseType } from '@/lib/utils';

export async function createAllocation({
  name,
  amount,
  designationId,
  allocationGroupId,
  periodId,
}: {
  name: string;
  amount: number;
  designationId: string;
  allocationGroupId?: string;
  periodId?: string;
}): Promise<ResponseType<Allocation>> {
  let resolvedPeriodId = periodId;
  if (!resolvedPeriodId) {
    const period = await prisma.period.findFirst({
      where: { deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
    if (!period)
      return {
        error:
          'No active period found. Please create a period before adding allocations.',
      } satisfies ErrorType;
    resolvedPeriodId = period.id;
  }

  const allocation = await prisma.allocation.create({
    data: {
      name,
      amount,
      designationId,
      allocationGroupId,
      periodId: resolvedPeriodId,
    },
  });

  revalidatePath('/allocation-groups');

  return { ...allocation, amount: allocation.amount.toNumber() };
}

export async function getAllocationById({
  id,
}: {
  id: string;
}): Promise<AllocationWithPurchases | null> {
  const allocation = await prisma.allocation.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
        include: { user: true },
      },
    },
  });

  if (allocation === null) return null;

  return {
    ...allocation,
    amount: allocation.amount.toNumber(),
    purchases: allocation.purchases.map((purchase) => ({
      ...purchase,
      amount: purchase.amount.toNumber(),
    })),
  };
}

export async function getMiscAllocations(
  designationId?: string,
): Promise<AllocationWithPurchases[]> {
  const allocations = await prisma.allocation.findMany({
    where: { allocationGroupId: null, ...(designationId && { designationId }) },
    include: {
      purchases: {
        orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
        include: { user: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return allocations.map((allocation) => ({
    ...allocation,
    amount: allocation.amount.toNumber(),
    purchases: allocation.purchases.map((purchase) => ({
      ...purchase,
      amount: purchase.amount.toNumber(),
    })),
  }));
}
