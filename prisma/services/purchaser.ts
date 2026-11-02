import type { SgaSession } from '@nusgaops/sgauth';

import { User } from '@/prisma/client';

import prisma from '@/lib/prisma';

function splitName(fullName: string): { first: string; last: string } {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);
  return { first, last: rest.join(' ') };
}

// Every signed-in SGAuth user gets exactly one purchaser row. An unlinked legacy
// row is linked on the user's first sign-in when its email matches, or when its
// full name matches exactly one unlinked row that has no conflicting email.
// The link is set only while the row is still unlinked, so it happens once.
export async function ensurePurchaserForSession(
  session: SgaSession,
): Promise<User> {
  const { id: sgauthUserId, email, name } = session.user;

  const linked = await prisma.user.findUnique({ where: { sgauthUserId } });
  if (linked) return linked;

  const legacyByEmail = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      sgauthUserId: null,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (legacyByEmail) {
    const { count } = await prisma.user.updateMany({
      where: { id: legacyByEmail.id, sgauthUserId: null },
      data: { sgauthUserId },
    });
    if (count === 1) return { ...legacyByEmail, sgauthUserId };
  }

  const { first, last } = splitName(name);
  if (last !== '') {
    const legacyByName = await prisma.user.findMany({
      where: {
        first: { equals: first, mode: 'insensitive' },
        last: { equals: last, mode: 'insensitive' },
        sgauthUserId: null,
        deletedAt: null,
        OR: [
          { email: null },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
      take: 2,
    });
    if (legacyByName.length === 1) {
      const [match] = legacyByName;
      const { count } = await prisma.user.updateMany({
        where: { id: match.id, sgauthUserId: null },
        data: { sgauthUserId, email },
      });
      if (count === 1) return { ...match, sgauthUserId, email };
    }
  }

  return prisma.user.upsert({
    where: { sgauthUserId },
    create: { first, last, email, sgauthUserId },
    update: {},
  });
}
