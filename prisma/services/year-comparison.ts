'use server';

import prisma from '@/lib/prisma';

export type YearComparisonYearData = {
  yearId: string;
  yearName: string;
  budget: number;
  spent: number;
  available: number;
  utilization: number;
};

export type YearComparisonCategoryData = {
  id: string;
  code: string;
  name: string;
  designationId: string;
  designationName: string;
  years: YearComparisonYearData[];
};

export type YearComparisonOverview = {
  yearId: string;
  yearName: string;
  totalBudget: number;
  totalSpent: number;
  utilization: number;
};

export type YearComparisonData = {
  overview: YearComparisonOverview[];
  categories: YearComparisonCategoryData[];
  years: { id: string; name: string }[];
};

export async function getYearComparisonData({
  yearIds,
  designationId,
}: {
  yearIds: string[];
  designationId?: string;
}): Promise<YearComparisonData> {
  if (yearIds.length === 0) return { overview: [], categories: [], years: [] };

  const [categories, years] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null, ...(designationId ? { designationId } : {}) },
      include: {
        designation: true,
        categoryYears: {
          where: { deletedAt: null, yearId: { in: yearIds } },
          select: { yearId: true, amount: true },
        },
        purchases: {
          where: { excludeFromTotal: false, yearId: { in: yearIds } },
          select: { amount: true, yearId: true },
        },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.year.findMany({
      where: { deletedAt: null, id: { in: yearIds } },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  const orderedYearIds = years.map((y) => y.id);

  const categoryData: YearComparisonCategoryData[] = categories.map(
    (category) => {
      const yearData: YearComparisonYearData[] = orderedYearIds.map(
        (yearId) => {
          const year = years.find((y) => y.id === yearId);
          const cy = category.categoryYears.find((cy) => cy.yearId === yearId);
          const budget = cy ? cy.amount.toNumber() : 0;
          const spent = category.purchases
            .filter((p) => p.yearId === yearId)
            .reduce((acc, p) => acc + p.amount.toNumber(), 0);
          return {
            yearId,
            yearName: year?.name ?? '',
            budget,
            spent,
            available: budget - spent,
            utilization: budget > 0 ? (spent / budget) * 100 : 0,
          };
        },
      );
      return {
        id: category.id,
        code: category.code,
        name: category.name,
        designationId: category.designationId,
        designationName: category.designation.name,
        years: yearData,
      };
    },
  );

  const activeCategories = categoryData.filter((cat) =>
    cat.years.some((y) => y.budget > 0 || y.spent > 0),
  );

  const overview: YearComparisonOverview[] = orderedYearIds.map((yearId) => {
    const year = years.find((y) => y.id === yearId);
    const totalBudget = activeCategories.reduce((acc, cat) => {
      const y = cat.years.find((y) => y.yearId === yearId);
      return acc + (y?.budget ?? 0);
    }, 0);
    const totalSpent = activeCategories.reduce((acc, cat) => {
      const y = cat.years.find((y) => y.yearId === yearId);
      return acc + (y?.spent ?? 0);
    }, 0);
    return {
      yearId,
      yearName: year?.name ?? '',
      totalBudget,
      totalSpent,
      utilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    };
  });

  return {
    overview,
    categories: activeCategories,
    years: years.map((y) => ({ id: y.id, name: y.name })),
  };
}
