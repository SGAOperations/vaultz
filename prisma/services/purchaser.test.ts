import type { SgaSession } from '@nusgaops/sgauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensurePurchaserForSession } from '@/prisma/services/purchaser';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));

function sessionFor(name: string, email: string): SgaSession {
  return {
    user: {
      id: 'sgauth-user-1',
      email,
      name,
      preferredName: null,
      isAdmin: false,
      isPrimaryAdmin: false,
    },
    positions: [],
    session: {
      id: 'session-1',
      expiresAt: '2030-01-01T00:00:00.000Z',
      absoluteExpiresAt: '2030-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

const legacyRow = {
  id: 'legacy-1',
  first: 'Ada',
  last: 'Lovelace',
  email: 'ada@northeastern.edu',
  sgauthUserId: null,
  createdAt: new Date('2025-01-01'),
  deletedAt: null,
};

describe('ensurePurchaserForSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([]);
  });

  it('returns the linked row without writing when the user already has one', async () => {
    const linked = { ...legacyRow, sgauthUserId: 'sgauth-user-1' };
    prisma.user.findUnique.mockResolvedValue(linked);

    const result = await ensurePurchaserForSession(
      sessionFor('Ada Lovelace', 'ada@northeastern.edu'),
    );

    expect(result).toBe(linked);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('links an unlinked legacy row whose email matches', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(legacyRow);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await ensurePurchaserForSession(
      sessionFor('Ada Lovelace', 'Ada@Northeastern.edu'),
    );

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { equals: 'Ada@Northeastern.edu', mode: 'insensitive' },
          sgauthUserId: null,
        }),
      }),
    );
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'legacy-1', sgauthUserId: null },
      data: { sgauthUserId: 'sgauth-user-1' },
    });
    expect(result).toEqual({ ...legacyRow, sgauthUserId: 'sgauth-user-1' });
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('links a legacy row with no email when its full name matches uniquely', async () => {
    const noEmailRow = { ...legacyRow, email: null };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([noEmailRow]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await ensurePurchaserForSession(
      sessionFor('Ada Lovelace', 'ada@northeastern.edu'),
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          first: { equals: 'Ada', mode: 'insensitive' },
          last: { equals: 'Lovelace', mode: 'insensitive' },
          sgauthUserId: null,
          deletedAt: null,
          OR: [
            { email: null },
            { email: { equals: 'ada@northeastern.edu', mode: 'insensitive' } },
          ],
        }),
        take: 2,
      }),
    );
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'legacy-1', sgauthUserId: null },
      data: { sgauthUserId: 'sgauth-user-1', email: 'ada@northeastern.edu' },
    });
    expect(result).toEqual({
      ...noEmailRow,
      sgauthUserId: 'sgauth-user-1',
      email: 'ada@northeastern.edu',
    });
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('does not link by name when two unlinked rows share the name', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([
      { ...legacyRow, id: 'a', email: null },
      { ...legacyRow, id: 'b', email: null },
    ]);
    prisma.user.upsert.mockResolvedValue({ id: 'new-1' });

    await ensurePurchaserForSession(
      sessionFor('Ada Lovelace', 'ada@northeastern.edu'),
    );

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
  });

  it('creates a single row when the legacy link was already claimed', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(legacyRow);
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    prisma.user.upsert.mockResolvedValue({ id: 'new-1' });

    await ensurePurchaserForSession(
      sessionFor('Ada Lovelace', 'ada@northeastern.edu'),
    );

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
  });

  it('creates a row keyed by the SGAuth id when no row matches', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.upsert.mockResolvedValue({ id: 'new-1' });

    const result = await ensurePurchaserForSession(
      sessionFor('  Grace   Brewster Hopper ', 'grace@northeastern.edu'),
    );

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { sgauthUserId: 'sgauth-user-1' },
      create: {
        first: 'Grace',
        last: 'Brewster Hopper',
        email: 'grace@northeastern.edu',
        sgauthUserId: 'sgauth-user-1',
      },
      update: {},
    });
    expect(result).toEqual({ id: 'new-1' });
  });

  it('skips the name match for a single-word name', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.upsert.mockResolvedValue({ id: 'new-1' });

    await ensurePurchaserForSession(sessionFor('Ada', 'ada@northeastern.edu'));

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ first: 'Ada', last: '' }),
      }),
    );
  });
});
