'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';

export async function createAllocation({
  name,
  amount,
}: {
  name: string;
  amount: number;
}) {
  const allocation = await prisma.allocation.create({ data: { name, amount } });

  revalidatePath('/allocation-groups');

  return { ...allocation, amount: allocation.amount.toNumber() };
}
