'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/client';

import prisma from '@/lib/prisma';
import {
  Category,
  CategoryWithAvailableAmountAndYears,
  CategoryWithDesignation,
  CategoryWithPurchases,
  CategoryYearRecord,
} from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function createCategory({
  designationId,
  code,
  ledgerCode,
  name,
  yearId,
  amount,
}: {
  designationId: string;
  code: string;
  ledgerCode: string;
  name: string;
  yearId?: string;
  amount?: number;
}): Promise<ResponseType<Category>> {
  const existing = await prisma.category.findFirst({
    where: { designationId, code, deletedAt: null },
  });
  if (existing)
    return { error: `SC${code} already exists in this designation.` };

  const category = await prisma.category.create({
    data: { designationId, code, ledgerCode, name },
  });

  if (yearId) {
    await prisma.categoryYear.create({
      data: {
        categoryId: category.id,
        yearId,
        amount: new Decimal(amount ?? 0),
      },
    });
  }

  revalidatePath('/categories');
  revalidatePath('/designation');

  return category;
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
      categoryYears: { where: { deletedAt: null } },
    },
  });
  if (!category) return null;

  return {
    ...category,
    categoryYears: category.categoryYears.map((cy) => ({
      ...cy,
      amount: cy.amount.toNumber(),
    })),
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
}): Promise<
  (CategoryWithDesignation & { categoryYears: CategoryYearRecord[] })[]
> {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    include: {
      designation: true,
      categoryYears: { where: { deletedAt: null } },
    },
  });

  return categories.map((category) => ({
    ...category,
    categoryYears: category.categoryYears.map((cy) => ({
      ...cy,
      amount: cy.amount.toNumber(),
    })),
  }));
}

export async function getCategoriesWithPurchasesByDesignation({
  designationId,
}: {
  designationId: string;
}): Promise<CategoryWithPurchases[]> {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    include: {
      designation: true,
      categoryYears: { where: { deletedAt: null } },
      purchases: {
        orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
        include: { user: true },
      },
    },
  });

  return categories.map((category) => ({
    ...category,
    categoryYears: category.categoryYears.map((cy) => ({
      ...cy,
      amount: cy.amount.toNumber(),
    })),
    purchases: category.purchases.map((purchase) => ({
      ...purchase,
      amount: purchase.amount.toNumber(),
    })),
  }));
}

export async function getAllCategories(): Promise<CategoryWithDesignation[]> {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { designation: true },
  });
  return categories;
}

export async function updateCategory({
  id,
  code,
  ledgerCode,
  name,
}: {
  id: string;
  code: string;
  ledgerCode: string;
  name: string;
}): Promise<ResponseType<Category>> {
  const category = await prisma.category.update({
    where: { id },
    data: { code, ledgerCode, name },
  });

  revalidatePath('/category');
  revalidatePath('/designation');

  return category;
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
}): Promise<CategoryWithAvailableAmountAndYears[]> {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    include: {
      designation: true,
      categoryYears: {
        where: { deletedAt: null },
        select: { amount: true, yearId: true },
      },
      purchases: {
        where: { excludeFromTotal: false },
        select: { amount: true },
      },
      transfersTo: { where: { deletedAt: null }, select: { amount: true } },
      transfersFrom: { where: { deletedAt: null }, select: { amount: true } },
    },
  });

  return categories.map((category) => {
    const budget = category.categoryYears.reduce(
      (acc, cy) => acc + cy.amount.toNumber(),
      0,
    );
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
      available: budget - spent + transfersIn - transfersOut,
      budget: budget + transfersIn - transfersOut,
      spent,
      yearIds: category.categoryYears.map((cy) => cy.yearId),
    };
  });
}
