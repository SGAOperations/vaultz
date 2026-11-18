'use server';

import { revalidatePath } from 'next/cache';

import { RequesterPosition } from '@/prisma/client';

import { isPositionKey, requireCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { ResponseType } from '@/lib/utils';

export async function getRequesterPositions(): Promise<RequesterPosition[]> {
  await requireCapability('view');

  return prisma.requesterPosition.findMany({ orderBy: { positionKey: 'asc' } });
}

export async function addRequesterPosition(
  positionKey: string,
): Promise<ResponseType<RequesterPosition>> {
  await requireCapability('edit');

  const key = positionKey.trim();
  if (!isPositionKey(key))
    return {
      error:
        'Use the SGAuth position key, e.g. vice-president-of-campus-affairs.',
    };

  const existing = await prisma.requesterPosition.findUnique({
    where: { positionKey: key },
  });
  if (existing) return { error: 'That position can already submit requests.' };

  const position = await prisma.requesterPosition.create({
    data: { positionKey: key },
  });

  revalidatePath('/requests/settings');
  return position;
}

export async function removeRequesterPosition(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  await requireCapability('edit');

  await prisma.requesterPosition.delete({ where: { id } });

  revalidatePath('/requests/settings');
  return { id };
}
