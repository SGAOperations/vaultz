'use server';

import prisma from '@/lib/prisma';
import { parseDateOnly } from '@/lib/utils';

export async function getDashboardStatsByDesignation(designationId: string) {
  const [categories, purchases] = await Promise.all([
    prisma.category.findMany({
      where: { designationId, deletedAt: null },
      select: { amount: true },
    }),
    prisma.purchase.findMany({
      where: { category: { designationId } },
      select: { amount: true },
    }),
  ]);

  const totalBudget = categories.reduce(
    (sum, c) => sum + c.amount.toNumber(),
    0,
  );
  const totalSpent = purchases.reduce((sum, p) => sum + p.amount.toNumber(), 0);

  return {
    totalCategories: categories.length,
    totalPurchases: purchases.length,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
  };
}

export async function getPurchasesByMonthForDesignation(designationId: string) {
  const purchases = await prisma.purchase.findMany({
    where: { category: { designationId } },
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
) {
  const categories = await prisma.category.findMany({
    where: { designationId, deletedAt: null },
    select: {
      name: true,
      amount: true,
      purchases: { select: { amount: true } },
    },
  });

  return categories.map((category) => {
    const budget = category.amount.toNumber();
    const spent = category.purchases.reduce(
      (sum, p) => sum + p.amount.toNumber(),
      0,
    );
    return { name: category.name, budget, spent, remaining: budget - spent };
  });
}
