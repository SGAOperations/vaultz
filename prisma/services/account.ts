'use server';

import prisma from '@/lib/prisma';
import { Account } from '@/prisma/client';

export async function getAccountsByIndex({
  indexId,
}: {
  indexId: string;
}): Promise<Account[]> {
  const accounts = await prisma.account.findMany({ where: { indexId } });

  return accounts;
}
