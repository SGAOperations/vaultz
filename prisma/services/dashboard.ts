'use server';

import prisma from '@/lib/prisma';

export async function getDashboardStats() {
  const [designations, categories, purchases, users] = await Promise.all([
    prisma.designation.count(),
    prisma.category.findMany({
      where: { deletedAt: null },
      select: { amount: true },
    }),
    prisma.purchase.findMany({ select: { amount: true, purchasedAt: true } }),
    prisma.user.count(),
  ]);

  const totalBudget = categories.reduce(
    (sum, category) => sum + category.amount.toNumber(),
    0,
  );
  const totalSpent = purchases.reduce(
    (sum, purchase) => sum + purchase.amount.toNumber(),
    0,
  );

  return {
    totalDesignations: designations,
    totalCategories: categories.length,
    totalPurchases: purchases.length,
    totalUsers: users,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
  };
}

export async function getPurchasesByMonth() {
  const purchases = await prisma.purchase.findMany({
    select: { amount: true, purchasedAt: true },
    orderBy: { purchasedAt: 'asc' },
  });

  const monthlyData = new Map<
    string,
    { monthKey: string; month: string; amount: number; count: number }
  >();

  purchases.forEach((purchase) => {
    const date = new Date(purchase.purchasedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });

    const existing = monthlyData.get(monthKey) || {
      monthKey,
      month: monthLabel,
      amount: 0,
      count: 0,
    };
    monthlyData.set(monthKey, {
      monthKey,
      month: monthLabel,
      amount: existing.amount + purchase.amount.toNumber(),
      count: existing.count + 1,
    });
  });

  return Array.from(monthlyData.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
}

export async function getSpendingByDesignation() {
  const designations = await prisma.designation.findMany({
    include: {
      categories: {
        where: { deletedAt: null },
        select: { amount: true, purchases: { select: { amount: true } } },
      },
    },
  });

  return designations.map((designation) => {
    const budget = designation.categories.reduce(
      (sum, category) => sum + category.amount.toNumber(),
      0,
    );
    const spent = designation.categories.reduce(
      (sum, category) =>
        sum +
        category.purchases.reduce(
          (pSum, purchase) => pSum + purchase.amount.toNumber(),
          0,
        ),
      0,
    );

    return { name: designation.name, budget, spent, remaining: budget - spent };
  });
}
