'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Account } from '@/lib/types';

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
