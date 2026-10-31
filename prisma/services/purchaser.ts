import type { SgaSession } from '@nusgaops/sgauth';

import { User } from '@/prisma/client';

import prisma from '@/lib/prisma';

function splitName(fullName: string): { first: string; last: string } {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);
  return { first, last: rest.join(' ') };
}

// Every signed-in SGAuth user gets exactly one purchaser row. A legacy row is
// linked by email on the user's first sign-in, and the link is set only while
// the row is still unlinked, so it can happen once.
export async function ensurePurchaserForSession(
  session: SgaSession,
): Promise<User> {
  const { id: sgauthUserId, email, name } = session.user;

  const linked = await prisma.user.findUnique({ where: { sgauthUserId } });
  if (linked) return linked;

  const legacy = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      sgauthUserId: null,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (legacy) {
    const { count } = await prisma.user.updateMany({
      where: { id: legacy.id, sgauthUserId: null },
      data: { sgauthUserId },
    });
    if (count === 1) return { ...legacy, sgauthUserId };
  }

  return prisma.user.upsert({
    where: { sgauthUserId },
    create: { ...splitName(name), email, sgauthUserId },
    update: {},
  });
}
