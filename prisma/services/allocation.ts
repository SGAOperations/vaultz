'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';

export async function createAllocation({
  name,
  amount,
  allocationGroupId,
}: {
  name: string;
  amount: number;
  allocationGroupId?: string;
}) {
  const allocation = await prisma.allocation.create({
    data: { name, amount, allocationGroupId },
  });

  revalidatePath('/allocation-groups');

  return { ...allocation, amount: allocation.amount.toNumber() };
}
