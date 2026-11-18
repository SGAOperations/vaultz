'use server';

import { revalidatePath } from 'next/cache';

import {
  BudgetResetBehavior,
  Designation,
  IndexRequestAccess,
} from '@/prisma/client';

import { isPositionKey, requireCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { DesignationWithPurchases } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getDesignations(): Promise<Designation[]> {
  await requireCapability('view');

  return await prisma.designation.findMany({ orderBy: { name: 'asc' } });
}

export async function getFirstDesignation(): Promise<Designation | null> {
  await requireCapability('view');

  return await prisma.designation.findFirst({ orderBy: { name: 'asc' } });
}

export async function getAllDesignations(): Promise<
  DesignationWithPurchases[]
> {
  await requireCapability('view');

  return (
    await prisma.designation.findMany({
      include: {
        categories: {
          select: {
            purchases: {
              where: { deletedAt: null },
              orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
              include: {
                user: true,
                process: { select: { templateId: true } },
              },
            },
            categoryYears: {
              where: { deletedAt: null },
              select: { amount: true },
            },
          },
        },
      },
    })
  ).map(({ categories, ...v }) => ({
    ...v,
    amount: categories.reduce(
      (acc, category) =>
        acc +
        category.categoryYears.reduce(
          (sum, cy) => sum + cy.amount.toNumber(),
          0,
        ),
      0,
    ),
    purchases: categories
      .flatMap((category) =>
        category.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => {
        const dateDiff = b.purchasedAt.getTime() - a.purchasedAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
  }));
}

export async function getDesignation({
  id,
}: {
  id: string;
}): Promise<DesignationWithPurchases | null> {
  await requireCapability('view');

  const designation = await prisma.designation.findUnique({
    where: { id },
    include: {
      categories: {
        select: {
          purchases: {
            where: { deletedAt: null },
            orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
            include: { user: true, process: { select: { templateId: true } } },
          },
          categoryYears: {
            where: { deletedAt: null },
            select: { amount: true },
          },
        },
      },
    },
  });

  if (!designation) return null;

  return {
    ...designation,
    amount: designation.categories.reduce(
      (acc, category) =>
        acc +
        category.categoryYears.reduce(
          (sum, cy) => sum + cy.amount.toNumber(),
          0,
        ),
      0,
    ),
    purchases: designation.categories
      .flatMap((category) =>
        category.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => {
        const dateDiff = b.purchasedAt.getTime() - a.purchasedAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
  };
}

export async function createDesignation({
  code,
  name,
  budgetResetBehavior,
}: {
  code: string;
  name: string;
  budgetResetBehavior: BudgetResetBehavior;
}): Promise<ResponseType<Designation>> {
  await requireCapability('edit');

  const designation = await prisma.designation.create({
    data: { code, name, budgetResetBehavior },
  });

  revalidatePath('/');
  revalidatePath('/designation');

  return designation;
}

export async function updateDesignation({
  id,
  name,
  code,
  budgetResetBehavior,
}: {
  id: string;
  name: string;
  code: string;
  budgetResetBehavior: BudgetResetBehavior;
}): Promise<ResponseType<Designation>> {
  await requireCapability('edit');

  const designation = await prisma.designation.update({
    where: { id },
    data: { name, code, budgetResetBehavior },
  });

  revalidatePath('/');
  revalidatePath('/designation');

  return designation;
}

export interface IndexRequestSettings {
  id: string;
  label: string;
  requestAccess: IndexRequestAccess;
  isBudgetIndex: boolean;
  headPositionKey: string | null;
  positions: { id: string; positionKey: string }[];
}

const POSITION_KEY_ERROR = {
  error: 'Use the SGAuth position key, e.g. vice-president-of-campus-affairs.',
};

function revalidateRequestSettings() {
  revalidatePath('/requests/settings');
  revalidatePath('/requests');
}

export async function getIndexRequestSettings(): Promise<
  IndexRequestSettings[]
> {
  await requireCapability('edit');

  const designations = await prisma.designation.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      requestAccess: true,
      isBudgetIndex: true,
      headPositionKey: true,
      requesterPositions: {
        select: { id: true, positionKey: true },
        orderBy: { positionKey: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });
  return designations.map(({ name, code, requesterPositions, ...d }) => ({
    ...d,
    label: `${name} · DN${code}`,
    positions: requesterPositions,
  }));
}

export async function setIndexRequestAccess({
  id,
  requestAccess,
}: {
  id: string;
  requestAccess: IndexRequestAccess;
}): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');
  if (!Object.values(IndexRequestAccess).includes(requestAccess))
    return { error: 'Choose one of the request access options.' };

  await prisma.designation.update({ where: { id }, data: { requestAccess } });
  revalidateRequestSettings();
  return { id };
}

// There is one budget index; marking one unmarks the rest.
export async function setBudgetIndex(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');

  await prisma.$transaction([
    prisma.designation.updateMany({
      where: { isBudgetIndex: true, id: { not: id } },
      data: { isBudgetIndex: false },
    }),
    prisma.designation.update({ where: { id }, data: { isBudgetIndex: true } }),
  ]);
  revalidateRequestSettings();
  return { id };
}

// The SGAuth position whose holders approve whole-index requests as head. An
// empty key removes it, so those requests skip the head step.
export async function setIndexHead({
  id,
  positionKey,
}: {
  id: string;
  positionKey: string;
}): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');
  const key = positionKey.trim();
  if (key && !isPositionKey(key)) return POSITION_KEY_ERROR;

  await prisma.designation.update({
    where: { id },
    data: { headPositionKey: key || null },
  });
  revalidateRequestSettings();
  return { id };
}

export async function addIndexRequesterPosition({
  designationId,
  positionKey,
}: {
  designationId: string;
  positionKey: string;
}): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');
  const key = positionKey.trim();
  if (!isPositionKey(key)) return POSITION_KEY_ERROR;

  const existing = await prisma.indexRequesterPosition.findUnique({
    where: { designationId_positionKey: { designationId, positionKey: key } },
  });
  if (existing) return { error: 'That position is already listed.' };

  const position = await prisma.indexRequesterPosition.create({
    data: { designationId, positionKey: key },
    select: { id: true },
  });
  revalidateRequestSettings();
  return position;
}

export async function removeIndexRequesterPosition(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');

  await prisma.indexRequesterPosition.delete({ where: { id } });
  revalidateRequestSettings();
  return { id };
}
