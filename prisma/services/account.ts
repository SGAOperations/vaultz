'use server';

import prisma from '@/lib/prisma';
import { Account } from '@/lib/types';
import { Decimal } from '@/prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';

export async function createAccount({
  indexId,
  code,
  amount,
}: {
  indexId: string;
  code: string;
  amount: number;
}): Promise<Account> {
  const account = await prisma.account.create({
    data: { indexId, code, amount: new Decimal(amount) },
  });

  revalidatePath('/index');

  return { ...account, amount: account.amount.toNumber() };
}

export async function getAccountsByIndex({
  indexId,
}: {
  indexId: string;
}): Promise<Account[]> {
  const accounts = await prisma.account.findMany({ where: { indexId } });

  return accounts.map((account) => ({
    ...account,
    amount: account.amount.toNumber(),
  }));
}
