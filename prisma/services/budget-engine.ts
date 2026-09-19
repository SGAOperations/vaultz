import { BudgetResetBehavior } from '@/prisma/client';
import { Decimal } from '@/prisma/client/runtime/client';

import prisma from '@/lib/prisma';

/**
 * Shared budget resolution for every year-scoped read path.
 *
 * A RESET designation starts each year from its stored `CategoryYear` amount.
 * A ROLLOVER designation carries the previous year's ending balance forward, so
 * a year with no stored amount is *not* a $0 year — it opens at whatever was
 * left over. A stored amount always wins: it is an explicit opening balance.
 */

const ZERO = new Decimal(0);

export type YearRef = { id: string; name: string };

export type YearActivity = {
  /** Stored CategoryYear amount, or null when the year has no record. */
  grant: Decimal | null;
  categoryYearId: string | null;
  spent: Decimal;
  transfersIn: Decimal;
  transfersOut: Decimal;
};

export type ResolvedYearBudget = {
  yearId: string;
  categoryYearId: string | null;
  /** Ending balance carried in from the previous year (0 for RESET). */
  carriedIn: number;
  /** Stored opening balance, or null when carried forward instead. */
  grant: number | null;
  budget: number;
  spent: number;
  available: number;
  /** True when the budget came from a carried-forward balance, not a stored row. */
  derived: boolean;
};

export type CategoryBudgetHistory = {
  id: string;
  code: string;
  ledgerCode: string;
  name: string;
  designationId: string;
  budgetResetBehavior: BudgetResetBehavior;
  years: Map<string, ResolvedYearBudget>;
};

function emptyActivity(): YearActivity {
  return {
    grant: null,
    categoryYearId: null,
    spent: ZERO,
    transfersIn: ZERO,
    transfersOut: ZERO,
  };
}

/**
 * Walks years oldest-first, threading each year's ending balance into the next.
 * Deficits carry forward too — an overspent rollover fund opens the next year
 * short rather than silently resetting to zero.
 */
export function resolveYearBudgets({
  behavior,
  orderedYears,
  activity,
}: {
  behavior: BudgetResetBehavior;
  orderedYears: YearRef[];
  activity: Map<string, YearActivity>;
}): Map<string, ResolvedYearBudget> {
  const rollover = behavior === 'ROLLOVER';
  const resolved = new Map<string, ResolvedYearBudget>();
  let carry = ZERO;

  for (const year of orderedYears) {
    const { grant, categoryYearId, spent, transfersIn, transfersOut } =
      activity.get(year.id) ?? emptyActivity();

    const carriedIn = rollover ? carry : ZERO;
    const base = grant ?? carriedIn;
    const budget = base.plus(transfersIn).minus(transfersOut);
    const available = budget.minus(spent);

    resolved.set(year.id, {
      yearId: year.id,
      categoryYearId,
      carriedIn: carriedIn.toNumber(),
      grant: grant ? grant.toNumber() : null,
      budget: budget.toNumber(),
      spent: spent.toNumber(),
      available: available.toNumber(),
      derived: rollover && grant === null,
    });

    carry = rollover ? available : ZERO;
  }

  return resolved;
}

/**
 * Loads every category's full year-by-year budget history.
 *
 * The whole year history is always loaded, even when the caller only cares
 * about one year: a ROLLOVER balance is the running total of everything that
 * came before it, so it cannot be computed from a single year in isolation.
 */
export async function getCategoryBudgetHistories({
  designationId,
  categoryIds,
}: { designationId?: string; categoryIds?: string[] } = {}): Promise<{
  years: YearRef[];
  categories: CategoryBudgetHistory[];
}> {
  const [categories, years] = await Promise.all([
    prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(designationId ? { designationId } : {}),
        ...(categoryIds ? { id: { in: categoryIds } } : {}),
      },
      include: {
        designation: { select: { budgetResetBehavior: true } },
        categoryYears: {
          where: { deletedAt: null },
          select: { id: true, yearId: true, amount: true },
        },
        purchases: {
          where: { excludeFromTotal: false, deletedAt: null },
          select: { amount: true, yearId: true },
        },
        transfersTo: {
          where: { deletedAt: null },
          select: { amount: true, yearId: true },
        },
        transfersFrom: {
          where: { deletedAt: null },
          select: { amount: true, yearId: true },
        },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.year.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const resolvedCategories = categories.map((category) => {
    const activity = new Map<string, YearActivity>();
    const entry = (yearId: string) => {
      const existing = activity.get(yearId);
      if (existing) return existing;
      const created = emptyActivity();
      activity.set(yearId, created);
      return created;
    };

    // Duplicate rows for one (category, year) are summed rather than picked
    // between, so totals never depend on which row a query happened to return.
    for (const cy of category.categoryYears) {
      const target = entry(cy.yearId);
      target.grant = (target.grant ?? ZERO).plus(cy.amount);
      target.categoryYearId ??= cy.id;
    }
    for (const purchase of category.purchases)
      entry(purchase.yearId).spent = entry(purchase.yearId).spent.plus(
        purchase.amount,
      );
    for (const transfer of category.transfersTo)
      entry(transfer.yearId).transfersIn = entry(
        transfer.yearId,
      ).transfersIn.plus(transfer.amount);
    for (const transfer of category.transfersFrom)
      entry(transfer.yearId).transfersOut = entry(
        transfer.yearId,
      ).transfersOut.plus(transfer.amount);

    return {
      id: category.id,
      code: category.code,
      ledgerCode: category.ledgerCode,
      name: category.name,
      designationId: category.designationId,
      budgetResetBehavior: category.designation.budgetResetBehavior,
      years: resolveYearBudgets({
        behavior: category.designation.budgetResetBehavior,
        orderedYears: years,
        activity,
      }),
    };
  });

  return { years, categories: resolvedCategories };
}

/** Zeroed fallback so callers never have to special-case a missing year. */
export function emptyYearBudget(yearId: string): ResolvedYearBudget {
  return {
    yearId,
    categoryYearId: null,
    carriedIn: 0,
    grant: null,
    budget: 0,
    spent: 0,
    available: 0,
    derived: false,
  };
}

/**
 * True when a category is worth showing for a year: it has a stored budget,
 * a carried-forward balance, or activity of its own.
 */
export function hasYearActivity(budget: ResolvedYearBudget): boolean {
  return (
    budget.categoryYearId !== null ||
    budget.budget !== 0 ||
    budget.spent !== 0 ||
    budget.carriedIn !== 0
  );
}
