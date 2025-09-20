'use server';

import prisma from '@/lib/prisma';
import { AllocationGroupWithAllocations } from '@/lib/types';

export async function getAllAllocationGroups(): Promise<
  AllocationGroupWithAllocations[]
> {
  return (
    await prisma.allocationGroup.findMany({ include: { allocations: true } })
  ).map(({ allocations, ...v }) => ({
    ...v,
    allocations: allocations.map(({ amount, ...a }) => ({
      ...a,
      amount: amount.toNumber(),
    })),
  }));
}
