'use server';

import { revalidatePath } from 'next/cache';

import { AllocationGroup } from '@/prisma/client';

import prisma from '@/lib/prisma';
import {
  AllocationGroupWithAllocations,
  AllocationGroupWithStats,
} from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getAllAllocationGroups(
  designationId?: string,
  periodId?: string,
  yearId?: string,
): Promise<AllocationGroupWithAllocations[]> {
  const allocationWhere = {
    ...(periodId ? { periodId } : {}),
    ...(yearId ? { period: { yearId } } : {}),
  };
  return (
    await prisma.allocationGroup.findMany({
      where: designationId ? { designationId } : undefined,
      include: {
        allocations: {
          where: Object.keys(allocationWhere).length > 0 ? allocationWhere : undefined,
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

export async function getAllocationGroupWithStats({
  id,
}: {
  id: string;
}): Promise<AllocationGroupWithStats | null> {
  const allocationGroup = await prisma.allocationGroup.findUnique({
    where: { id },
    include: {
      designation: true,
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

  const allocations = allocationGroup.allocations.map(
    ({ amount, purchases, ...a }) => {
      const convertedPurchases = purchases.map(({ amount, ...p }) => ({
        ...p,
        amount: amount.toNumber(),
      }));
      const spent = convertedPurchases
        .filter((p) => !p.excludeFromTotal)
        .reduce((acc, p) => acc + p.amount, 0);
      const allocationAmount = amount.toNumber();
      return {
        ...a,
        amount: allocationAmount,
        purchases: convertedPurchases,
        spent,
        remaining: allocationAmount - spent,
      };
    },
  );

  const allPurchases = allocations
    .flatMap((a) => a.purchases)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    ...allocationGroup,
    allocations,
    totalAmount: allocations.reduce((acc, a) => acc + a.amount, 0),
    totalSpent: allPurchases
      .filter((p) => !p.excludeFromTotal)
      .reduce((acc, p) => acc + p.amount, 0),
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
