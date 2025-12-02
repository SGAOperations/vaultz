'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { Account, AccountWithIndex, AccountWithPurchases } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function createAccount({
  indexId,
  code,
  name,
  amount,
}: {
  indexId: string;
  code: string;
  name: string;
  amount: number;
}): Promise<ResponseType<Account>> {
  const account = await prisma.account.create({
    data: { indexId, code, name, amount: new Decimal(amount) },
  });

  revalidatePath('/index');

  return { ...account, amount: account.amount.toNumber() };
}

export async function getAccountById({
  id,
}: {
  id: string;
}): Promise<AccountWithPurchases | null> {
  const account = await prisma.account.findUnique({
    where: { id, deletedAt: null },
    include: {
      purchases: { orderBy: { createdAt: 'desc' }, include: { user: true } },
      index: true,
    },
  });
  if (!account) return null;

  return {
    ...account,
    amount: account.amount.toNumber(),
    purchases: account.purchases.map((purchase) => ({
      ...purchase,
      amount: purchase.amount.toNumber(),
    })),
  };
}

export async function getAccountsByIndex({
  indexId,
}: {
  indexId: string;
}): Promise<AccountWithIndex[]> {
  const accounts = await prisma.account.findMany({
    where: { indexId, deletedAt: null },
    include: { index: true },
  });

  return accounts.map((account) => ({
    ...account,
    amount: account.amount.toNumber(),
  }));
}

export async function getAllAccounts(): Promise<AccountWithIndex[]> {
  const accounts = await prisma.account.findMany({
    where: { deletedAt: null },
    include: { index: true },
  });
  return accounts.map((account) => ({
    ...account,
    amount: account.amount.toNumber(),
  }));
}

export async function updateAccount({
  id,
  code,
  name,
  amount,
}: {
  id: string;
  code: string;
  name: string;
  amount: number;
}): Promise<ResponseType<Account>> {
  const account = await prisma.account.update({
    where: { id, deletedAt: null },
    data: { code, name, amount: new Decimal(amount) },
  });

  revalidatePath('/index');
  revalidatePath('/account');

  return { ...account, amount: account.amount.toNumber() };
}

export async function deleteAccount(id: string): Promise<ResponseType<void>> {
  await prisma.account.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/index');
  revalidatePath('/account');
}
