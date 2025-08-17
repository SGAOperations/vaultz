'use server';

import prisma from '@/lib/prisma';
import { IndexWithPurchases } from '@/lib/types';

export async function getAllIndexes(): Promise<IndexWithPurchases[]> {
  return (
    await prisma.index.findMany({
      include: { accounts: { select: { purchases: true } } },
    })
  ).map(({ accounts, ...v }) => ({
    ...v,
    purchases: accounts.flatMap((account) =>
      account.purchases.map(({ amount, ...v }) => ({
        ...v,
        amount: amount.toNumber(),
      }))
    ),
  }));
}
