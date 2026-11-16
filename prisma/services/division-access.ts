'use server';

import { revalidatePath } from 'next/cache';

import { PositionDivisionAccess } from '@/prisma/client';

import {
  AddDivisionAccessInput,
  RemoveDivisionAccessInput,
  addDivisionAccessSchema,
  removeDivisionAccessSchema,
} from '@/lib/division-access';
import { requireCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

export interface DivisionAccessRow {
  id: string;
  name: string;
  designationId: string;
  designationCode: string;
  designationName: string;
  assignments: { id: string; positionKey: string }[];
}

function revalidateDivisionPages() {
  revalidatePath('/divisions/access');
  revalidatePath('/divisions');
}

export async function getDivisionAccess(): Promise<DivisionAccessRow[]> {
  await requireCapability('edit');

  const groups = await prisma.allocationGroup.findMany({
    select: {
      id: true,
      name: true,
      designationId: true,
      designation: { select: { code: true, name: true } },
      positionAccess: {
        select: { id: true, positionKey: true },
        orderBy: { positionKey: 'asc' },
      },
    },
    orderBy: [{ designation: { code: 'asc' } }, { name: 'asc' }],
  });

  return groups.map(({ designation, positionAccess, ...group }) => ({
    ...group,
    designationCode: designation.code,
    designationName: designation.name,
    assignments: positionAccess,
  }));
}

export async function addDivisionAccess(
  input: AddDivisionAccessInput,
): Promise<ResponseType<PositionDivisionAccess>> {
  await requireCapability('edit');

  const parsed = addDivisionAccessSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid assignment.' };
  const { allocationGroupId, positionKey } = parsed.data;

  const [group, existing] = await Promise.all([
    prisma.allocationGroup.findUnique({
      where: { id: allocationGroupId },
      select: { name: true },
    }),
    prisma.positionDivisionAccess.findUnique({
      where: {
        positionKey_allocationGroupId: { positionKey, allocationGroupId },
      },
    }),
  ]);
  if (!group) return { error: 'That division no longer exists.' };
  if (existing)
    return { error: `${positionKey} is already assigned to ${group.name}.` };

  const assignment = await prisma.positionDivisionAccess.create({
    data: { positionKey, allocationGroupId },
  });

  revalidateDivisionPages();
  return assignment;
}

export async function removeDivisionAccess(
  input: RemoveDivisionAccessInput,
): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');

  const parsed = removeDivisionAccessSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid assignment.' };

  const { count } = await prisma.positionDivisionAccess.deleteMany({
    where: { id: parsed.data.id },
  });
  if (count === 0) return { error: 'That assignment was already removed.' };

  revalidateDivisionPages();
  return { id: parsed.data.id };
}
