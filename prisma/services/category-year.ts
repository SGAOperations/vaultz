'use server';

import { revalidatePath } from 'next/cache';

import { Decimal } from '@/prisma/client/runtime/client';
import {
  emptyYearBudget,
  getCategoryBudgetHistories,
  hasYearActivity,
} from '@/prisma/services/budget-engine';

import prisma from '@/lib/prisma';
import { ResponseType, isError } from '@/lib/utils';

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
  /** Balance carried forward from the previous year (0 unless ROLLOVER). */
  carriedIn: number;
  /** True when the budget is carried forward rather than stored. */
  derived: boolean;
};

export type YearBudgetEntry = {
  yearId: string;
  yearName: string;
  amount: number;
  spent: number;
  derived: boolean;
};

export type CategoryBudgetAcrossYears = {
  id: string;
  code: string;
  ledgerCode: string;
  name: string;
  yearBudgets: YearBudgetEntry[];
};

export type RolloverSuggestions = {
  prevYear: { id: string; name: string } | null;
  suggestions: RolloverSuggestion[];
};

export type RolloverSuggestion = {
  categoryId: string;
  name: string;
  prevBudget: number;
  prevSpent: number;
  prevAvailable: number;
  suggestedAmount: number;
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
  const { categories } = await getCategoryBudgetHistories({ designationId });

  return categories
    .map((category) => ({
      category,
      year: category.years.get(yearId) ?? emptyYearBudget(yearId),
    }))
    .filter(({ year }) => hasYearActivity(year))
    .map(({ category, year }) => ({
      id: category.id,
      code: category.code,
      ledgerCode: category.ledgerCode,
      name: category.name,
      designationId: category.designationId,
      categoryYearId: year.categoryYearId,
      budget: year.budget,
      spent: year.spent,
      available: year.available,
      carriedIn: year.carriedIn,
      derived: year.derived,
    }));
}

export async function getCategoryBudgetsAcrossYears({
  designationId,
}: {
  designationId: string;
}): Promise<{
  categories: CategoryBudgetAcrossYears[];
  years: Array<{ id: string; name: string }>;
}> {
  const { categories, years } = await getCategoryBudgetHistories({
    designationId,
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      code: category.code,
      ledgerCode: category.ledgerCode,
      name: category.name,
      yearBudgets: years.map((year) => {
        const resolved =
          category.years.get(year.id) ?? emptyYearBudget(year.id);
        return {
          yearId: year.id,
          yearName: year.name,
          amount: resolved.budget,
          spent: resolved.spent,
          derived: resolved.derived,
        };
      }),
    })),
    years: years.map((y) => ({ id: y.id, name: y.name })),
  };
}

/**
 * Opening balances a ROLLOVER designation should start `yearId` with, based on
 * where the previous year ended. Used to pre-fill the budget dialog and by
 * `applyRolloverForYear` to store the values explicitly.
 */
export async function getRolloverSuggestions({
  designationId,
  yearId,
}: {
  designationId: string;
  yearId: string;
}): Promise<RolloverSuggestions> {
  const { categories, years } = await getCategoryBudgetHistories({
    designationId,
  });

  const index = years.findIndex((y) => y.id === yearId);
  const prevYear = index > 0 ? years[index - 1] : null;

  return {
    prevYear,
    suggestions: categories.map((category) => {
      const target = category.years.get(yearId) ?? emptyYearBudget(yearId);
      const prev =
        (prevYear && category.years.get(prevYear.id)) ?? emptyYearBudget('');

      return {
        categoryId: category.id,
        name: category.name,
        prevBudget: prev.budget,
        prevSpent: prev.spent,
        prevAvailable: prev.available,
        suggestedAmount: target.grant ?? target.carriedIn,
      };
    }),
  };
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
      where: { yearId, category: { designationId }, deletedAt: null },
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

/**
 * Stores the carried-forward balances for a ROLLOVER designation as explicit
 * `CategoryYear` rows, pinning them so later edits to the previous year no
 * longer move them. Balances already read correctly without this — it is for
 * locking a year in, and is safe to run more than once.
 */
export async function applyRolloverForYear({
  designationId,
  yearId,
}: {
  designationId: string;
  yearId: string;
}): Promise<ResponseType<{ applied: number }>> {
  const designation = await prisma.designation.findUnique({
    where: { id: designationId },
    select: { name: true, budgetResetBehavior: true },
  });
  if (!designation)
    return { error: 'The selected designation does not exist.' };
  if (designation.budgetResetBehavior !== 'ROLLOVER')
    return {
      error: `${designation.name} resets each year, so there is nothing to roll over.`,
    };

  const { suggestions } = await getRolloverSuggestions({
    designationId,
    yearId,
  });
  if (suggestions.length === 0) return { applied: 0 };

  const result = await setYearBudgetsForDesignation({
    designationId,
    yearId,
    budgets: suggestions.map((s) => ({
      categoryId: s.categoryId,
      amount: s.suggestedAmount,
    })),
  });
  if (isError(result)) return result;

  return { applied: suggestions.length };
}

export async function deleteCategoryYear(
  id: string,
): Promise<ResponseType<void>> {
  await prisma.categoryYear.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/categories');
}

export async function updateCategoryYearBudget({
  categoryId,
  yearId,
  amount,
  force,
}: {
  categoryId: string;
  yearId: string;
  amount: number;
  force?: boolean;
}): Promise<ResponseType<void>> {
  const year = await prisma.year.findUnique({
    where: { id: yearId, deletedAt: null },
    select: { endDate: true, name: true },
  });
  if (!year) return { error: 'Year not found.' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!force && year.endDate < today) {
    const purchaseCount = await prisma.purchase.count({
      where: { categoryId, yearId, deletedAt: null },
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
