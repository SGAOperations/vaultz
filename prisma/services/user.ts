import prisma from '@/lib/prisma';
import { User } from '@/prisma/client';

export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany();
}
