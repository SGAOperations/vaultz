'use server';

import { revalidatePath } from 'next/cache';

import { AllocationGroup } from '@/prisma/client';

import { isPositionKey, requireCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { OPEN_REQUEST_STATUSES } from '@/lib/purchase-request';
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
  await requireCapability('view');

  return (
    await prisma.allocationGroup.findMany({
      where: designationId ? { designationId } : undefined,
      include: {
        allocations: {
          where: {
            deletedAt: null,
            ...(periodId
              ? { periodId }
              : yearId
                ? { period: { yearId } }
                : undefined),
          },
          include: {
            purchases: {
              where: { deletedAt: null },
              orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
              include: {
                user: true,
                process: { select: { templateId: true } },
              },
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
  await requireCapability('view');

  const allocationGroup = await prisma.allocationGroup.findUnique({
    where: { id: id },
    include: {
      allocations: {
        include: {
          purchases: {
            where: { deletedAt: null },
            orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
            include: { user: true, process: { select: { templateId: true } } },
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
  periodId,
}: {
  id: string;
  periodId?: string;
}): Promise<AllocationGroupWithStats | null> {
  await requireCapability('view');

  const allocationGroup = await prisma.allocationGroup.findUnique({
    where: { id },
    include: {
      designation: true,
      allocations: {
        where: periodId ? { periodId, deletedAt: null } : { deletedAt: null },
        include: {
          purchases: {
            where: { deletedAt: null },
            orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
            include: { user: true, process: { select: { templateId: true } } },
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

  const committed = await prisma.purchaseRequest.aggregate({
    where: {
      allocationId: { in: allocations.map((a) => a.id) },
      deletedAt: null,
      status: { in: OPEN_REQUEST_STATUSES },
    },
    _sum: { amount: true },
    _count: true,
  });

  const allPurchases = allocations
    .flatMap((a) => a.purchases)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    ...allocationGroup,
    allocations,
    totalAmount: allocations.reduce((acc, a) => acc + a.amount, 0),
    totalCommitted: committed._sum.amount?.toNumber() ?? 0,
    openRequestCount: committed._count,
    totalSpent: allPurchases
      .filter((p) => !p.excludeFromTotal)
      .reduce((acc, p) => acc + p.amount, 0),
  };
}

export async function createAllocationGroup(data: {
  name: string;
  designationId: string;
}): Promise<ResponseType<AllocationGroup>> {
  await requireCapability('edit');

  const allocationGroup = await prisma.allocationGroup.create({
    data: { name: data.name, designationId: data.designationId },
  });

  revalidatePath('/allocation-groups');

  return allocationGroup;
}

export interface DivisionHead {
  id: string;
  name: string;
  designationLabel: string;
  headPositionKey: string | null;
}

export async function getDivisionHeads(): Promise<DivisionHead[]> {
  await requireCapability('edit');

  const groups = await prisma.allocationGroup.findMany({
    select: {
      id: true,
      name: true,
      headPositionKey: true,
      designation: { select: { name: true, code: true } },
    },
    orderBy: [{ designation: { code: 'asc' } }, { name: 'asc' }],
  });
  return groups.map(({ designation, ...g }) => ({
    ...g,
    designationLabel: `${designation.name} · DN${designation.code}`,
  }));
}

// The SGAuth position whose holders approve the division's requests as its
// head. An empty key removes the head, so its requests skip that step.
export async function setDivisionHead({
  id,
  positionKey,
}: {
  id: string;
  positionKey: string;
}): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');

  const key = positionKey.trim();
  if (key && !isPositionKey(key))
    return {
      error:
        'Use the SGAuth position key, e.g. vice-president-of-campus-affairs.',
    };

  await prisma.allocationGroup.update({
    where: { id },
    data: { headPositionKey: key || null },
  });

  revalidatePath('/requests/settings');
  return { id };
}
