'use server';

import { revalidatePath } from 'next/cache';

import { Period, Year } from '@/prisma/client';

import { requireCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

import { rolloverBudgetsForYear } from './category-year';

function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getActiveYear(): Promise<Year | null> {
  await requireCapability('view');

  const today = getStartOfToday();

  return await prisma.year.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });
}

export async function getActivePeriod(): Promise<
  (Period & { year: Year }) | null
> {
  await requireCapability('view');

  const today = getStartOfToday();

  return await prisma.period.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
      year: { deletedAt: null },
    },
    include: { year: true },
    orderBy: { startDate: 'desc' },
  });
}

export async function getActivePeriods(): Promise<(Period & { year: Year })[]> {
  await requireCapability('view');

  const today = getStartOfToday();

  return await prisma.period.findMany({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
      year: { deletedAt: null },
    },
    include: { year: true },
    orderBy: { startDate: 'desc' },
  });
}

export async function getAllYears(): Promise<Year[]> {
  await requireCapability('view');

  return await prisma.year.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: 'desc' },
  });
}

export async function getPeriodsForYear(
  yearId: string,
  includeDeleted = false,
): Promise<Period[]> {
  await requireCapability('view');

  return await prisma.period.findMany({
    where: { yearId, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: { startDate: 'asc' },
  });
}

export async function getAllPeriods(): Promise<Period[]> {
  await requireCapability('view');

  return await prisma.period.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: 'desc' },
  });
}

export type YearWithPeriods = Year & { periods: Period[] };

export async function getYearsWithPeriods(): Promise<YearWithPeriods[]> {
  await requireCapability('view');

  return prisma.year.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: 'desc' },
    include: {
      periods: { where: { deletedAt: null }, orderBy: { startDate: 'asc' } },
    },
  });
}

export async function createYear({
  name,
  startDate,
  endDate,
}: {
  name: string;
  startDate: Date;
  endDate: Date;
}): Promise<ResponseType<Year>> {
  await requireCapability('edit');

  const overlapping = await prisma.year.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) return { error: `Overlaps with year "${overlapping.name}"` };

  const year = await prisma.year.create({ data: { name, startDate, endDate } });

  // Rollover designations carry their unspent balance into every new year,
  // regardless of which designation the year happened to be created from.
  await rolloverBudgetsForYear({ yearId: year.id });

  revalidatePath('/periods');
  revalidatePath('/categories');

  return year;
}

export async function updateYear({
  id,
  name,
  startDate,
  endDate,
}: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}): Promise<ResponseType<Year>> {
  await requireCapability('edit');

  const overlapping = await prisma.year.findFirst({
    where: {
      deletedAt: null,
      id: { not: id },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) return { error: `Overlaps with year "${overlapping.name}"` };

  const year = await prisma.year.update({
    where: { id, deletedAt: null },
    data: { name, startDate, endDate },
  });

  revalidatePath('/periods');

  return year;
}

export async function deleteYear({
  id,
}: {
  id: string;
}): Promise<ResponseType<Year>> {
  await requireCapability('edit');

  const purchaseCount = await prisma.purchase.count({ where: { yearId: id } });

  if (purchaseCount > 0)
    return {
      error: `Cannot delete: ${purchaseCount} purchase(s) are linked to this year`,
    };

  const transferCount = await prisma.transfer.count({ where: { yearId: id } });

  if (transferCount > 0)
    return {
      error: `Cannot delete: ${transferCount} transfer(s) are linked to this year`,
    };

  const year = await prisma.year.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/periods');

  return year;
}

export async function createPeriod({
  name,
  yearId,
  startDate,
  endDate,
}: {
  name: string;
  yearId: string;
  startDate: Date;
  endDate: Date;
}): Promise<ResponseType<Period>> {
  await requireCapability('edit');

  const period = await prisma.period.create({
    data: { name, yearId, startDate, endDate },
  });

  revalidatePath('/periods');

  return period;
}

export async function updatePeriod({
  id,
  name,
  yearId,
  startDate,
  endDate,
}: {
  id: string;
  name: string;
  yearId: string;
  startDate: Date;
  endDate: Date;
}): Promise<ResponseType<Period>> {
  await requireCapability('edit');

  const period = await prisma.period.update({
    where: { id, deletedAt: null },
    data: { name, yearId, startDate, endDate },
  });

  revalidatePath('/periods');

  return period;
}

export async function deletePeriod({
  id,
}: {
  id: string;
}): Promise<ResponseType<Period>> {
  await requireCapability('edit');

  const allocationCount = await prisma.allocation.count({
    where: { periodId: id },
  });

  if (allocationCount > 0)
    return {
      error: `Cannot delete: ${allocationCount} allocation(s) are linked to this period`,
    };

  const period = await prisma.period.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/periods');

  return period;
}
