import type { SgaSession } from '@nusgaops/sgauth';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createUser } from '@/prisma/services/user';

import { ForbiddenError } from '@/lib/permissions';

const { prisma, requireSession } = vi.hoisted(() => ({
  prisma: { user: { create: vi.fn() } },
  requireSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));
vi.mock('@nusgaops/sgauth/next', () => ({ requireSession }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function sessionWith(...keys: string[]): SgaSession {
  return {
    user: {
      id: 'user-1',
      email: 'user@northeastern.edu',
      name: 'Test User',
      preferredName: null,
      isAdmin: false,
      isPrimaryAdmin: false,
    },
    positions: keys.map((key) => ({ key, name: key })),
    session: {
      id: 'session-1',
      expiresAt: '2030-01-01T00:00:00.000Z',
      absoluteExpiresAt: '2030-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

// Branches that still have the passphrase flag bypass permissions unless it is
// set. Remove this once the flag is gone (#748).
beforeAll(() => {
  process.env.SGAUTH_ENABLED = 'true';
});

describe('createUser (gated server action)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a viewer and writes nothing', async () => {
    requireSession.mockResolvedValue(sessionWith('senator'));

    await expect(
      createUser({ first: 'Grace', last: 'Hopper' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates the user for an editor', async () => {
    requireSession.mockResolvedValue(sessionWith('comptroller'));
    prisma.user.create.mockResolvedValue({ id: 'new-1' });

    await createUser({ first: 'Grace', last: 'Hopper' });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ first: 'Grace', last: 'Hopper' }),
    });
  });
});
