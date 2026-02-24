'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import {
  Category,
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
}: {
  designationId: string;
  code: string;
  ledgerCode: string;
  name: string;
}): Promise<ResponseType<Category>> {
  const category = await prisma.category.create({
    data: { designationId, code, ledgerCode, name },
  });

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
