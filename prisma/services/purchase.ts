import prisma from '@/lib/prisma';
import { Purchase } from '@/lib/types';
import { Decimal } from '@/prisma/client/runtime/library';

export async function createPurcase({
  userId,
  accountId,
  description,
  amount,
}: {
  userId: string;
  accountId: string;
  description?: string;
  amount: number;
}): Promise<Purchase> {
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      accountId,
      description: description || '',
      amount: new Decimal(amount),
    },
  });

  return { ...purchase, amount: purchase.amount.toNumber() };
}
