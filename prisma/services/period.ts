'use server';

import { revalidatePath } from 'next/cache';

import { Period, Year } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getActiveYear(): Promise<Year | null> {
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
  const today = getStartOfToday();

  return await prisma.period.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
      year: { deletedAt: null },
    },
    include: { year: true },
  });
}

export async function getAllYears(): Promise<Year[]> {
  return await prisma.year.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: 'desc' },
  });
}

export async function getPeriodsForYear(yearId: string): Promise<Period[]> {
  return await prisma.period.findMany({
    where: { yearId, deletedAt: null },
    orderBy: { startDate: 'asc' },
  });
}

export async function getAllPeriods(): Promise<Period[]> {
  return await prisma.period.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: 'desc' },
  });
}

export type YearWithPeriods = Year & { periods: Period[] };

export async function getYearsWithPeriods(): Promise<YearWithPeriods[]> {
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
  const overlapping = await prisma.year.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) return { error: `Overlaps with year "${overlapping.name}"` };

  const year = await prisma.year.create({ data: { name, startDate, endDate } });

  revalidatePath('/periods');

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
  const overlapping = await prisma.period.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping)
    return { error: `Overlaps with period "${overlapping.name}"` };

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
  const overlapping = await prisma.period.findFirst({
    where: {
      deletedAt: null,
      id: { not: id },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping)
    return { error: `Overlaps with period "${overlapping.name}"` };

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
