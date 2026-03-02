'use server';

import { revalidatePath } from 'next/cache';

import { BudgetResetBehavior, Designation } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { DesignationWithPurchases } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getDesignations(): Promise<Designation[]> {
  return await prisma.designation.findMany({ orderBy: { name: 'asc' } });
}

export async function getAllDesignations(): Promise<
  DesignationWithPurchases[]
> {
  return (
    await prisma.designation.findMany({
      include: {
        categories: {
          select: {
            purchases: {
              orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
              include: { user: true },
            },
            categoryYears: {
              where: { deletedAt: null },
              select: { amount: true },
            },
          },
        },
      },
    })
  ).map(({ categories, ...v }) => ({
    ...v,
    amount: categories.reduce(
      (acc, category) =>
        acc +
        category.categoryYears.reduce(
          (sum, cy) => sum + cy.amount.toNumber(),
          0,
        ),
      0,
    ),
    purchases: categories
      .flatMap((category) =>
        category.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => {
        const dateDiff = b.purchasedAt.getTime() - a.purchasedAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
  }));
}

export async function getDesignation({
  id,
}: {
  id: string;
}): Promise<DesignationWithPurchases | null> {
  const designation = await prisma.designation.findUnique({
    where: { id },
    include: {
      categories: {
        select: {
          purchases: {
            orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
            include: { user: true },
          },
          categoryYears: {
            where: { deletedAt: null },
            select: { amount: true },
          },
        },
      },
    },
  });

  if (!designation) return null;

  return {
    ...designation,
    amount: designation.categories.reduce(
      (acc, category) =>
        acc +
        category.categoryYears.reduce(
          (sum, cy) => sum + cy.amount.toNumber(),
          0,
        ),
      0,
    ),
    purchases: designation.categories
      .flatMap((category) =>
        category.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => {
        const dateDiff = b.purchasedAt.getTime() - a.purchasedAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
  };
}

export async function createDesignation({
  code,
  name,
  budgetResetBehavior,
}: {
  code: string;
  name: string;
  budgetResetBehavior: BudgetResetBehavior;
}): Promise<ResponseType<Designation>> {
  const designation = await prisma.designation.create({
    data: { code, name, budgetResetBehavior },
  });

  revalidatePath('/');
  revalidatePath('/designation');

  return designation;
}

export async function updateDesignation({
  id,
  name,
  code,
  budgetResetBehavior,
}: {
  id: string;
  name: string;
  code: string;
  budgetResetBehavior: BudgetResetBehavior;
}): Promise<ResponseType<Designation>> {
  const designation = await prisma.designation.update({
    where: { id },
    data: { name, code, budgetResetBehavior },
  });

  revalidatePath('/');
  revalidatePath('/designation');

  return designation;
}
