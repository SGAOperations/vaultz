'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { Allocation, AllocationWithPurchases } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function createAllocation({
  name,
  amount,
  allocationGroupId,
}: {
  name: string;
  amount: number;
  allocationGroupId?: string;
}): Promise<ResponseType<Allocation>> {
  const allocation = await prisma.allocation.create({
    data: { name, amount, allocationGroupId },
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
      purchases: { orderBy: { createdAt: 'desc' }, include: { user: true } },
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

export async function getMiscAllocations(): Promise<AllocationWithPurchases[]> {
  const allocations = await prisma.allocation.findMany({
    where: { allocationGroupId: null },
    include: {
      purchases: { orderBy: { createdAt: 'desc' }, include: { user: true } },
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
