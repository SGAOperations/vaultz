'use server';

import prisma from '@/lib/prisma';

export async function getAllIndexes() {
  return (
    await prisma.index.findMany({
      include: { accounts: { select: { purchases: true } } },
    })
  ).map(({ accounts, ...v }) => ({
    ...v,
    purchases: accounts.flatMap((account) => account.purchases),
  }));
}
