'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { AllocationGroupWithAllocations } from '@/lib/types';

export async function getAllAllocationGroups(): Promise<
  AllocationGroupWithAllocations[]
> {
  return (
    await prisma.allocationGroup.findMany({
      include: {
        allocations: { include: { purchases: { include: { user: true } } } },
      },
    })
  ).map(({ allocations, ...v }) => ({
    ...v,
    allocations: allocations.map(({ amount, purchases, ...a }) => ({
      ...a,
      amount: amount.toNumber(),
      purchases: purchases.map(({ amount, ...p }) => ({
        ...p,
        amount: amount.toNumber(),
      })),
    })),
  }));
}

export async function createAllocationGroup(data: { name: string }) {
  const allocationGroup = await prisma.allocationGroup.create({
    data: { name: data.name },
  });

  revalidatePath('/allocation-groups');

  return allocationGroup;
}
