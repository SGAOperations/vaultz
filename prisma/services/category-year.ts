'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/library';

import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

export type CategoryBudgetForYear = {
  id: string;
  code: string;
  ledgerCode: string;
  name: string;
  designationId: string;
  categoryYearId: string | null;
  budget: number;
  spent: number;
  available: number;
};

export type YearBudgetEntry = {
  yearId: string;
  yearName: string;
  amount: number;
  spent: number;
};

export type CategoryBudgetAcrossYears = {
  id: string;
  code: string;
  ledgerCode: string;
  name: string;
  yearBudgets: YearBudgetEntry[];
};

export async function getCategoriesNotInYear({
  designationId,
  yearId,
}: {
  designationId: string;
  yearId: string;
}): Promise<{ id: string; code: string; ledgerCode: string; name: string }[]> {
  return prisma.category.findMany({
    where: {
      designationId,
      deletedAt: null,
      categoryYears: { none: { yearId, deletedAt: null } },
    },
    select: { id: true, code: true, ledgerCode: true, name: true },
    orderBy: { code: 'asc' },
  });
}

export async function getCategoriesWithBudgetForYear({
  designationId,
  yearId,
}: {
  designationId: string;
  yearId: string;
}): Promise<CategoryBudgetForYear[]> {
  const categories = await prisma.category.findMany({
    where: {
      designationId,
      deletedAt: null,
      categoryYears: { some: { yearId, deletedAt: null } },
    },
    include: {
      categoryYears: { where: { yearId, deletedAt: null } },
      purchases: {
        where: { yearId, excludeFromTotal: false },
        select: { amount: true },
      },
      transfersTo: { where: { yearId }, select: { amount: true } },
      transfersFrom: { where: { yearId }, select: { amount: true } },
    },
    orderBy: { code: 'asc' },
  });

  return categories.map((category) => {
    const categoryYear = category.categoryYears[0] ?? null;
    const budget = categoryYear ? categoryYear.amount.toNumber() : 0;
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
      id: category.id,
      code: category.code,
      ledgerCode: category.ledgerCode,
      name: category.name,
      designationId: category.designationId,
      categoryYearId: categoryYear?.id ?? null,
      budget,
      spent,
      available: budget - spent + transfersIn - transfersOut,
    };
  });
}

export async function getCategoryBudgetsAcrossYears({
  designationId,
}: {
  designationId: string;
}): Promise<{
  categories: CategoryBudgetAcrossYears[];
  years: Array<{ id: string; name: string }>;
}> {
  const [categories, years] = await Promise.all([
    prisma.category.findMany({
      where: { designationId, deletedAt: null },
      include: {
        categoryYears: {
          where: { deletedAt: null },
          select: { yearId: true, amount: true },
        },
        purchases: {
          where: { excludeFromTotal: false },
          select: { amount: true, yearId: true },
        },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.year.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  const categoryBudgets = categories.map((category) => {
    const yearBudgets: YearBudgetEntry[] = years.map((year) => {
      const cy = category.categoryYears.find((cy) => cy.yearId === year.id);
      const spent = category.purchases
        .filter((p) => p.yearId === year.id)
        .reduce((acc, p) => acc + p.amount.toNumber(), 0);
      return {
        yearId: year.id,
        yearName: year.name,
        amount: cy ? cy.amount.toNumber() : 0,
        spent,
      };
    });
    return {
      id: category.id,
      code: category.code,
      ledgerCode: category.ledgerCode,
      name: category.name,
      yearBudgets,
    };
  });

  return {
    categories: categoryBudgets,
    years: years.map((y) => ({ id: y.id, name: y.name })),
  };
}

export async function getNewYearSuggestions({
  designationId,
  prevYearId,
}: {
  designationId: string;
  prevYearId: string;
}): Promise<
  Array<{
    categoryId: string;
    name: string;
    prevBudget: number;
    prevSpent: number;
    unused: number;
    suggestedAmount: number;
  }>
> {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    include: {
      categoryYears: {
        where: { yearId: prevYearId, deletedAt: null },
        select: { amount: true },
      },
      purchases: {
        where: { yearId: prevYearId, excludeFromTotal: false },
        select: { amount: true },
      },
    },
    orderBy: { code: 'asc' },
  });

  return categories.map((category) => {
    const prevBudget = category.categoryYears[0]?.amount.toNumber() ?? 0;
    const prevSpent = category.purchases.reduce(
      (acc, p) => acc + p.amount.toNumber(),
      0,
    );
    const unused = Math.max(0, prevBudget - prevSpent);
    return {
      categoryId: category.id,
      name: category.name,
      prevBudget,
      prevSpent,
      unused,
      suggestedAmount: prevBudget + unused,
    };
  });
}

export async function setYearBudgetsForDesignation({
  designationId,
  yearId,
  budgets,
}: {
  designationId: string;
  yearId: string;
  budgets: Array<{ categoryId: string; amount: number }>;
}): Promise<ResponseType<void>> {
  const year = await prisma.year.findUnique({
    where: { id: yearId, deletedAt: null },
  });
  if (!year) return { error: 'The selected year does not exist.' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastYear = year.endDate < today;

  if (isPastYear) {
    const purchaseCount = await prisma.purchase.count({
      where: { yearId, category: { designationId } },
    });
    if (purchaseCount > 0)
      return {
        error: `Cannot set budgets: ${year.name} is a past year with ${purchaseCount} purchase(s).`,
      };
  }

  const categoryIds = budgets.map((b) => b.categoryId);
  const existingRecords = await prisma.categoryYear.findMany({
    where: { categoryId: { in: categoryIds }, yearId, deletedAt: null },
    select: { id: true, categoryId: true },
  });
  const existingMap = new Map(existingRecords.map((r) => [r.categoryId, r.id]));

  await prisma.$transaction(
    budgets.map(({ categoryId, amount }) => {
      const existingId = existingMap.get(categoryId);
      if (existingId)
        return prisma.categoryYear.update({
          where: { id: existingId },
          data: { amount: new Decimal(amount) },
        });
      return prisma.categoryYear.create({
        data: { categoryId, yearId, amount: new Decimal(amount) },
      });
    }),
  );

  revalidatePath('/categories');
}

export async function updateCategoryYearBudget({
  categoryId,
  yearId,
  amount,
}: {
  categoryId: string;
  yearId: string;
  amount: number;
}): Promise<ResponseType<void>> {
  const year = await prisma.year.findUnique({
    where: { id: yearId, deletedAt: null },
    select: { endDate: true, name: true },
  });
  if (!year) return { error: 'Year not found.' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (year.endDate < today) {
    const purchaseCount = await prisma.purchase.count({
      where: { categoryId, yearId },
    });
    if (purchaseCount > 0)
      return {
        error: `Cannot edit budget: ${year.name} is a past year with ${purchaseCount} purchase(s).`,
      };
  }

  const existing = await prisma.categoryYear.findFirst({
    where: { categoryId, yearId, deletedAt: null },
  });

  if (existing) {
    await prisma.categoryYear.update({
      where: { id: existing.id },
      data: { amount: new Decimal(amount) },
    });
  } else {
    await prisma.categoryYear.create({
      data: { categoryId, yearId, amount: new Decimal(amount) },
    });
  }

  revalidatePath('/categories');
}
