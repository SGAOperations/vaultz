'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import {
  Category,
  CategoryWithAvailableAmount,
  CategoryWithDesignation,
  CategoryWithPurchases,
} from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function createCategory({
  designationId,
  code,
  ledgerCode,
  name,
  amount,
}: {
  designationId: string;
  code: string;
  ledgerCode: string;
  name: string;
  amount: number;
}): Promise<ResponseType<Category>> {
  const category = await prisma.category.create({
    data: {
      designationId,
      code,
      ledgerCode,
      name,
      amount: new Decimal(amount),
    },
  });

  revalidatePath('/designation');

  return { ...category, amount: category.amount.toNumber() };
}

export async function getCategoryById({
  id,
}: {
  id: string;
}): Promise<CategoryWithPurchases | null> {
  const category = await prisma.category.findUnique({
    where: { id, deletedAt: null },
    include: {
      purchases: {
        orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
        include: { user: true },
      },
      designation: true,
    },
  });
  if (!category) return null;

  return {
    ...category,
    amount: category.amount.toNumber(),
    purchases: category.purchases.map((purchase) => ({
      ...purchase,
      amount: purchase.amount.toNumber(),
    })),
  };
}

export async function getCategoriesByDesignation({
  designationId,
}: {
  designationId: string;
}): Promise<CategoryWithDesignation[]> {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    include: { designation: true },
  });

  return categories.map((category) => ({
    ...category,
    amount: category.amount.toNumber(),
  }));
}

export async function getAllCategories(): Promise<CategoryWithDesignation[]> {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { designation: true },
  });
  return categories.map((category) => ({
    ...category,
    amount: category.amount.toNumber(),
  }));
}

export async function updateCategory({
  id,
  code,
  ledgerCode,
  name,
  amount,
}: {
  id: string;
  code: string;
  ledgerCode: string;
  name: string;
  amount: number;
}): Promise<ResponseType<Category>> {
  const category = await prisma.category.update({
    where: { id },
    data: { code, ledgerCode, name, amount: new Decimal(amount) },
  });

  revalidatePath('/category');
  revalidatePath('/designation');

  return { ...category, amount: category.amount.toNumber() };
}

export async function deleteCategory(id: string): Promise<ResponseType<void>> {
  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/category');
  revalidatePath('/designation');
}

export async function getCategoriesWithAvailableAmount({
  designationId,
}: {
  designationId: string;
}): Promise<CategoryWithAvailableAmount[]> {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    include: {
      designation: true,
      purchases: {
        where: { excludeFromTotal: false },
        select: { amount: true },
      },
      transfersTo: { select: { amount: true } },
      transfersFrom: { select: { amount: true } },
    },
  });

  return categories.map((category) => {
    const spent = category.purchases.reduce(
      (acc, p) => acc + p.amount.toNumber(),
      0,
    );
    const transfersIn = category.transfersTo.reduce(
      (acc, t) => acc + t.amount.toNumber(),
      0,
    );
    const transfersOut = category.transfersFrom.reduce(
      (acc, t) => acc + t.amount.toNumber(),
      0,
    );
    return {
      ...category,
      amount: category.amount.toNumber(),
      available:
        category.amount.toNumber() - spent + transfersIn - transfersOut,
    };
  });
}
