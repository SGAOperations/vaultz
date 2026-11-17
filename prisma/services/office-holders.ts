import type { SgaSession } from '@nusgaops/sgauth';

import { User } from '@/prisma/client';

import { positionsChanged } from '@/lib/positions';
import prisma from '@/lib/prisma';

// Stores the user's current SGAuth positions, writing only when they change.
export async function syncUserPositions(
  user: User,
  session: SgaSession,
): Promise<User> {
  const keys = [...new Set(session.positions.map((p) => p.key))];
  if (!positionsChanged(user.positionKeys, keys)) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: { positionKeys: keys, positionsChangedAt: new Date() },
  });
}

// SGAuth doesn't yet tell products who holds a position
// (SGAOperations/auth#384), so this uses the most recent person seen signing
// in with it: a new officer takes over once they sign in.
export async function findOfficeHolderSgauthId(
  positionKey: string,
): Promise<string | null> {
  const holder = await prisma.user.findFirst({
    where: {
      positionKeys: { has: positionKey },
      deletedAt: null,
      sgauthUserId: { not: null },
    },
    orderBy: { positionsChangedAt: 'desc' },
    select: { sgauthUserId: true },
  });
  return holder?.sgauthUserId ?? null;
}
