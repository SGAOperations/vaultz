'use server';

import { revalidatePath } from 'next/cache';

import { User } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { UserWithPurchases } from '@/lib/types';

export async function createUser({
  first,
  last,
}: {
  first: string;
  last: string;
}): Promise<User> {
  const data = await prisma.user.create({ data: { first, last } });

  revalidatePath(`/users`);

  return data;
}

export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany({ where: { deletedAt: null } });
}

export async function getUsersWithPurchases(): Promise<UserWithPurchases[]> {
  return (
    await prisma.user.findMany({
      where: { deletedAt: null },
      include: { purchases: true },
    })
  ).map((user) => ({
    ...user,
    purchases: user.purchases.map((purchase) => ({
      ...purchase,
      amount: purchase.amount.toNumber(),
    })),
  }));
}

export async function updateUser({
  first,
  last,
  id,
}: {
  first: string;
  last: string;
  id: string;
}) {
  const data = await prisma.user.update({
    where: { id, deletedAt: null },
    data: { first, last },
  });

  revalidatePath(`/users`);

  return data;
}

export async function deleteUser({ id }: { id: string }) {
  const data = await prisma.user.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/users`);

  return data;
}
