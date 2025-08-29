'use server';

import { User } from '@/prisma/client';

import prisma from '@/lib/prisma';

export async function createUser({
  first,
  last,
}: {
  first: string;
  last: string;
}): Promise<User> {
  return await prisma.user.create({ data: { first, last } });
}

export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany();
}
