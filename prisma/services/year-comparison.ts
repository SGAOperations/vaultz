'use server';

import {
  emptyYearBudget,
  getCategoryBudgetHistories,
} from '@/prisma/services/budget-engine';

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

  const [{ categories, years }, designations] = await Promise.all([
    getCategoryBudgetHistories({ designationId }),
    prisma.designation.findMany({ select: { id: true, name: true } }),
  ]);

  const designationNames = new Map(designations.map((d) => [d.id, d.name]));
  const selectedYears = years.filter((year) => yearIds.includes(year.id));

  const categoryData: YearComparisonCategoryData[] = categories.map(
    (category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      designationId: category.designationId,
      designationName: designationNames.get(category.designationId) ?? '',
      years: selectedYears.map((year) => {
        const resolved =
          category.years.get(year.id) ?? emptyYearBudget(year.id);
        return {
          yearId: year.id,
          yearName: year.name,
          budget: resolved.budget,
          spent: resolved.spent,
          available: resolved.available,
          utilization:
            resolved.budget > 0 ? (resolved.spent / resolved.budget) * 100 : 0,
        };
      }),
    }),
  );

  const activeCategories = categoryData.filter((cat) =>
    cat.years.some((y) => y.budget !== 0 || y.spent !== 0),
  );

  const overview: YearComparisonOverview[] = selectedYears.map((year) => {
    const totals = activeCategories.reduce(
      (acc, cat) => {
        const y = cat.years.find((y) => y.yearId === year.id);
        return {
          budget: acc.budget + (y?.budget ?? 0),
          spent: acc.spent + (y?.spent ?? 0),
        };
      },
      { budget: 0, spent: 0 },
    );
    return {
      yearId: year.id,
      yearName: year.name,
      totalBudget: totals.budget,
      totalSpent: totals.spent,
      utilization: totals.budget > 0 ? (totals.spent / totals.budget) * 100 : 0,
    };
  });

  return {
    overview,
    categories: activeCategories,
    years: selectedYears.map((y) => ({ id: y.id, name: y.name })),
  };
}
