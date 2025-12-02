'use server';

import { revalidatePath } from 'next/cache';

import { Designation } from '@/prisma/client';

import prisma from '@/lib/prisma';
import { DesignationWithPurchases } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getAllDesignations(): Promise<
  DesignationWithPurchases[]
> {
  return (
    await prisma.designation.findMany({
      include: {
        categories: {
          select: {
            purchases: {
              orderBy: { createdAt: 'desc' },
              include: { user: true },
            },
            amount: true,
          },
        },
      },
    })
  ).map(({ categories, ...v }) => ({
    ...v,
    amount: categories.reduce(
      (acc, category) => acc + category.amount.toNumber(),
      0,
    ),
    purchases: categories
      .flatMap((category) =>
        category.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  }));
}

export async function getDesignation({
  id,
}: {
  id: string;
}): Promise<DesignationWithPurchases | null> {
  const designation = await prisma.designation.findUnique({
    where: { id },
    include: {
      categories: {
        select: {
          purchases: {
            orderBy: { createdAt: 'desc' },
            include: { user: true },
          },
          amount: true,
        },
      },
    },
  });

  if (!designation) return null;

  return {
    ...designation,
    amount: designation.categories.reduce(
      (acc, category) => acc + category.amount.toNumber(),
      0,
    ),
    purchases: designation.categories
      .flatMap((category) =>
        category.purchases.map(({ amount, ...v }) => ({
          ...v,
          amount: amount.toNumber(),
        })),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  };
}

export async function createDesignation({
  code,
  name,
}: {
  code: string;
  name: string;
}): Promise<ResponseType<Designation>> {
  const designation = await prisma.designation.create({ data: { code, name } });

  revalidatePath('/');

  return designation;
}
