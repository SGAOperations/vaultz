'use server';

import { revalidatePath } from 'next/cache';

import { Result } from '@/lib/error-handler';
import prisma from '@/lib/prisma';
import { AllocationGroup, AllocationGroupWithAllocations } from '@/lib/types';

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

export async function getAllocationGroup({
  id,
}: {
  id: string;
}): Promise<AllocationGroupWithAllocations | null> {
  const allocationGroup = await prisma.allocationGroup.findUnique({
    where: { id: id },
    include: {
      allocations: { include: { purchases: { include: { user: true } } } },
    },
  });

  if (!allocationGroup) return null;

  return {
    ...allocationGroup,
    allocations: allocationGroup.allocations.map(
      ({ amount, purchases, ...a }) => ({
        ...a,
        amount: amount.toNumber(),
        purchases: purchases.map(({ amount, ...p }) => ({
          ...p,
          amount: amount.toNumber(),
        })),
      }),
    ),
  };
}

export async function createAllocationGroup(data: {
  name: string;
}): Promise<Result<AllocationGroup>> {
  const allocationGroup = await prisma.allocationGroup.create({
    data: { name: data.name },
  });

  revalidatePath('/allocation-groups');

  return allocationGroup;
}
