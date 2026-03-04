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
  periodId?: string,
  yearId?: string,
): Promise<AllocationWithPurchases[]> {
  const allocations = await prisma.allocation.findMany({
    where: {
      allocationGroupId: null,
      ...(designationId && { designationId }),
      ...(periodId && { periodId }),
      ...(yearId && { period: { yearId } }),
    },
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

export async function copyAllocationsFromPeriod({
  fromPeriodId,
  toPeriodId,
  copyAmounts,
  includeCarryover,
}: {
  fromPeriodId: string;
  toPeriodId: string;
  copyAmounts: boolean;
  includeCarryover: boolean;
}): Promise<ResponseType<{ count: number }>> {
  const sourceAllocations = await prisma.allocation.findMany({
    where: { periodId: fromPeriodId },
    include: { purchases: { where: { excludeFromTotal: false } } },
  });

  if (sourceAllocations.length === 0)
    return { error: 'No allocations found in the source period' };

  await prisma.allocation.createMany({
    data: sourceAllocations.map((allocation) => {
      let amount = copyAmounts ? allocation.amount.toNumber() : 0;

      if (copyAmounts && includeCarryover) {
        const spent = allocation.purchases.reduce(
          (acc, p) => acc + p.amount.toNumber(),
          0,
        );
        amount =
          allocation.amount.toNumber() + (allocation.amount.toNumber() - spent);
      }

      return {
        name: allocation.name,
        amount,
        designationId: allocation.designationId,
        allocationGroupId: allocation.allocationGroupId,
        periodId: toPeriodId,
      };
    }),
  });

  revalidatePath('/allocation-groups');

  return { count: sourceAllocations.length };
}
