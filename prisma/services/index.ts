'use server';

import prisma from '@/lib/prisma';
import { IndexWithPurchases } from '@/lib/types';
import { Index } from '@/prisma/client';

export async function getAllIndexes(): Promise<IndexWithPurchases[]> {
  return (
    await prisma.index.findMany({
      include: {
        accounts: { select: { purchases: { include: { user: true } } } },
      },
    })
  ).map(({ accounts, ...v }) => ({
    ...v,
    purchases: accounts.flatMap((account) =>
      account.purchases.map(({ amount, ...v }) => ({
        ...v,
        amount: amount.toNumber(),
      })),
    ),
  }));
}

export async function getIndex({
  id,
}: {
  id: string;
}): Promise<IndexWithPurchases> {
  const index = await prisma.index.findUnique({
    where: { id },
    include: {
      accounts: { select: { purchases: { include: { user: true } } } },
    },
  });

  if (!index) throw Error('Index does not exist');

  return {
    ...index,
    purchases: index.accounts.flatMap((account) =>
      account.purchases.map(({ amount, ...v }) => ({
        ...v,
        amount: amount.toNumber(),
      })),
    ),
  };
}

export async function createIndex({
  code,
  name,
}: {
  code: string;
  name: string;
}): Promise<Index> {
  return await prisma.index.create({ data: { code, name } });
}
