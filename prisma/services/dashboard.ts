'use server';

import {
  emptyYearBudget,
  getCategoryBudgetHistories,
  hasYearActivity,
} from '@/prisma/services/budget-engine';

import prisma from '@/lib/prisma';
import { parseDateOnly } from '@/lib/utils';

export async function getDashboardStatsByDesignation(
  designationId: string,
  yearId: string,
) {
  const [{ categories }, totalPurchases] = await Promise.all([
    getCategoryBudgetHistories({ designationId }),
    prisma.purchase.count({
      where: {
        category: { designationId },
        yearId,
        excludeFromTotal: false,
        deletedAt: null,
      },
    }),
  ]);

  const active = categories
    .map((category) => category.years.get(yearId) ?? emptyYearBudget(yearId))
    .filter(hasYearActivity);

  const totalBudget = active.reduce((sum, year) => sum + year.budget, 0);
  const totalSpent = active.reduce((sum, year) => sum + year.spent, 0);

  return {
    totalCategories: active.length,
    totalPurchases,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
  };
}

export async function getPurchasesByMonthForDesignation(
  designationId: string,
  yearId: string,
) {
  const purchases = await prisma.purchase.findMany({
    where: {
      category: { designationId },
      yearId,
      excludeFromTotal: false,
      deletedAt: null,
    },
    select: { amount: true, purchasedAt: true },
    orderBy: [{ purchasedAt: 'asc' }, { createdAt: 'asc' }],
  });

  const monthlyData = new Map<
    string,
    { monthKey: string; month: string; amount: number; count: number }
  >();

  for (const purchase of purchases) {
    const date = parseDateOnly(purchase.purchasedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const month = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
    const existing = monthlyData.get(monthKey) ?? {
      monthKey,
      month,
      amount: 0,
      count: 0,
    };
    monthlyData.set(monthKey, {
      ...existing,
      amount: existing.amount + purchase.amount.toNumber(),
      count: existing.count + 1,
    });
  }

  return Array.from(monthlyData.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
}

export async function getSpendingByCategoryForDesignation(
  designationId: string,
  yearId: string,
) {
  const { categories } = await getCategoryBudgetHistories({ designationId });

  return categories.map((category) => {
    const year = category.years.get(yearId) ?? emptyYearBudget(yearId);
    return {
      name: category.name,
      budget: year.budget,
      spent: year.spent,
      remaining: year.available,
    };
  });
}
