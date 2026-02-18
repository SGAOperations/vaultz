'use server';

import { revalidatePath } from 'next/cache';

import { AllocationGroup } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { AllocationGroupWithAllocations } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getAllAllocationGroups(
  designationId?: string,
): Promise<AllocationGroupWithAllocations[]> {
  return (
    await prisma.allocationGroup.findMany({
      where: designationId ? { designationId } : undefined,
      include: {
        allocations: {
          include: {
            purchases: {
              orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
              include: { user: true },
            },
          },
        },
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
      allocations: {
        include: {
          purchases: {
            orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
            include: { user: true },
          },
        },
      },
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
  designationId: string;
}): Promise<ResponseType<AllocationGroup>> {
  const allocationGroup = await prisma.allocationGroup.create({
    data: { name: data.name, designationId: data.designationId },
  });

  revalidatePath('/allocation-groups');

  return allocationGroup;
}
