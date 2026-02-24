'use server';

import { Period, Year } from '@/prisma/client';

import prisma from '@/lib/prisma';

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
