'use server';

import { User } from '@/prisma/client';

import prisma from '@/lib/prisma';

export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany();
}
