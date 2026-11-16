'use server';

import { revalidatePath } from 'next/cache';

import { PositionDivisionAccess, Prisma } from '@/prisma/client';

import {
  AddDivisionAccessInput,
  RemoveDivisionAccessInput,
  addDivisionAccessSchema,
  removeDivisionAccessSchema,
} from '@/lib/division-access';
import { VIEW_ONLY_POSITIONS, requireCapability } from '@/lib/permissions';
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

export interface AssignablePositions {
  viewPositions: string[];
  requesterPositions: string[];
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

// View positions see mapped divisions on the dashboard; requester positions
// can submit purchase requests against them. Any other key would grant nothing.
export async function getAssignablePositions(): Promise<AssignablePositions> {
  await requireCapability('edit');

  const requesters = await prisma.requesterPosition.findMany({
    select: { positionKey: true },
    orderBy: { positionKey: 'asc' },
  });

  return {
    viewPositions: [...VIEW_ONLY_POSITIONS].sort(),
    requesterPositions: requesters
      .map((r) => r.positionKey)
      .filter((key) => !VIEW_ONLY_POSITIONS.includes(key)),
  };
}

async function isAssignablePosition(positionKey: string): Promise<boolean> {
  if (VIEW_ONLY_POSITIONS.includes(positionKey)) return true;
  const requester = await prisma.requesterPosition.findUnique({
    where: { positionKey },
    select: { id: true },
  });
  return requester !== null;
}

export async function addDivisionAccess(
  input: AddDivisionAccessInput,
): Promise<ResponseType<PositionDivisionAccess>> {
  await requireCapability('edit');

  const parsed = addDivisionAccessSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid assignment.' };
  const { allocationGroupId, positionKey } = parsed.data;

  const [group, assignable] = await Promise.all([
    prisma.allocationGroup.findUnique({
      where: { id: allocationGroupId },
      select: { name: true },
    }),
    isAssignablePosition(positionKey),
  ]);
  if (!group) return { error: 'That division no longer exists.' };
  if (!assignable)
    return {
      error: `${positionKey} has no view access and isn't a requester position. Add it under Request Settings first.`,
    };

  try {
    const assignment = await prisma.positionDivisionAccess.create({
      data: { positionKey, allocationGroupId },
    });
    revalidateDivisionPages();
    return assignment;
  } catch (error) {
    // The unique index on (positionKey, allocationGroupId) is the duplicate check.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      return { error: `${positionKey} is already assigned to ${group.name}.` };
    throw error;
  }
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
