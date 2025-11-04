'use server';

import { revalidatePath } from 'next/cache';

import { Index } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { IndexWithPurchases } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getAllIndexes(): Promise<IndexWithPurchases[]> {
  return (
    await prisma.index.findMany({
      include: {
        accounts: {
          select: {
            purchases: {
              orderBy: { timestamp: 'desc' },
              include: { user: true },
            },
            amount: true,
          },
        },
      },
    })
  ).map(({ accounts, ...v }) => ({
    ...v,
    amount: accounts.reduce(
      (acc, account) => acc + account.amount.toNumber(),
      0,
    ),
    purchases: accounts
      .flatMap((account) =>
        account.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
  }));
}

export async function getIndex({
  id,
}: {
  id: string;
}): Promise<IndexWithPurchases | null> {
  const index = await prisma.index.findUnique({
    where: { id },
    include: {
      accounts: {
        select: {
          purchases: {
            orderBy: { timestamp: 'desc' },
            include: { user: true },
          },
          amount: true,
        },
      },
    },
  });

  if (!index) return null;

  return {
    ...index,
    amount: index.accounts.reduce(
      (acc, account) => acc + account.amount.toNumber(),
      0,
    ),
    purchases: index.accounts
      .flatMap((account) =>
        account.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
  };
}

export async function createIndex({
  code,
  name,
}: {
  code: string;
  name: string;
}): Promise<ResponseType<Index>> {
  const index = await prisma.index.create({ data: { code, name } });

  revalidatePath('/');

  return index;
}
