'use server';

import prisma from '@/lib/prisma';

export async function getDashboardStats() {
  const [indexes, accounts, purchases, users] = await Promise.all([
    prisma.index.count(),
    prisma.account.findMany({ select: { amount: true } }),
    prisma.purchase.findMany({ select: { amount: true, purchasedAt: true } }),
    prisma.user.count(),
  ]);

  const totalBudget = accounts.reduce(
    (sum, account) => sum + account.amount.toNumber(),
    0,
  );
  const totalSpent = purchases.reduce(
    (sum, purchase) => sum + purchase.amount.toNumber(),
    0,
  );

  return {
    totalIndexes: indexes,
    totalAccounts: accounts.length,
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
    { month: string; amount: number; count: number }
  >();

  purchases.forEach((purchase) => {
    const date = new Date(purchase.purchasedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });

    const existing = monthlyData.get(monthKey) || {
      month: monthLabel,
      amount: 0,
      count: 0,
    };
    monthlyData.set(monthKey, {
      month: monthLabel,
      amount: existing.amount + purchase.amount.toNumber(),
      count: existing.count + 1,
    });
  });

  return Array.from(monthlyData.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
}

export async function getSpendingByIndex() {
  const indexes = await prisma.index.findMany({
    include: {
      accounts: {
        select: { amount: true, purchases: { select: { amount: true } } },
      },
    },
  });

  return indexes.map((index) => {
    const budget = index.accounts.reduce(
      (sum, account) => sum + account.amount.toNumber(),
      0,
    );
    const spent = index.accounts.reduce(
      (sum, account) =>
        sum +
        account.purchases.reduce(
          (pSum, purchase) => pSum + purchase.amount.toNumber(),
          0,
        ),
      0,
    );

    return { name: index.name, budget, spent, remaining: budget - spent };
  });
}
