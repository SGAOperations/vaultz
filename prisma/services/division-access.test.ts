import type { SgaSession } from '@nusgaops/sgauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addDivisionAccess,
  getDivisionAccess,
  removeDivisionAccess,
} from '@/prisma/services/division-access';

import { ForbiddenError } from '@/lib/permissions';

const { prisma, requireSession, revalidatePath } = vi.hoisted(() => ({
  prisma: {
    allocationGroup: { findMany: vi.fn(), findUnique: vi.fn() },
    positionDivisionAccess: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  requireSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));
vi.mock('@nusgaops/sgauth/next', () => ({ requireSession }));
vi.mock('next/cache', () => ({ revalidatePath }));

const GROUP_ID = '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60';
const ASSIGNMENT_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

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

const editor = () => sessionWith('comptroller');
const viewer = () => sessionWith('parliamentarian');

describe('division access actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('non-editors', () => {
    it('cannot list assignments', async () => {
      requireSession.mockResolvedValue(viewer());

      await expect(getDivisionAccess()).rejects.toBeInstanceOf(ForbiddenError);
      expect(prisma.allocationGroup.findMany).not.toHaveBeenCalled();
    });

    it('cannot add an assignment', async () => {
      requireSession.mockResolvedValue(viewer());

      await expect(
        addDivisionAccess({
          allocationGroupId: GROUP_ID,
          positionKey: 'parliamentarian',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prisma.positionDivisionAccess.create).not.toHaveBeenCalled();
    });

    it('cannot remove an assignment', async () => {
      requireSession.mockResolvedValue(viewer());

      await expect(
        removeDivisionAccess({ id: ASSIGNMENT_ID }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prisma.positionDivisionAccess.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('getDivisionAccess', () => {
    it('flattens designations and assignments per division', async () => {
      requireSession.mockResolvedValue(editor());
      prisma.allocationGroup.findMany.mockResolvedValue([
        {
          id: GROUP_ID,
          name: 'Events',
          designationId: 'des-1',
          designation: { code: 'SGA', name: 'Student Government' },
          positionAccess: [{ id: ASSIGNMENT_ID, positionKey: 'senator' }],
        },
      ]);

      await expect(getDivisionAccess()).resolves.toEqual([
        {
          id: GROUP_ID,
          name: 'Events',
          designationId: 'des-1',
          designationCode: 'SGA',
          designationName: 'Student Government',
          assignments: [{ id: ASSIGNMENT_ID, positionKey: 'senator' }],
        },
      ]);
    });
  });

  describe('addDivisionAccess', () => {
    beforeEach(() => {
      requireSession.mockResolvedValue(editor());
    });

    it('rejects a malformed position key without touching the database', async () => {
      const result = await addDivisionAccess({
        allocationGroupId: GROUP_ID,
        positionKey: 'Vice President!',
      });

      expect(result).toEqual({
        error:
          'Use the SGAuth position key, e.g. vice-president-of-campus-affairs.',
      });
      expect(prisma.allocationGroup.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a malformed division id', async () => {
      const result = await addDivisionAccess({
        allocationGroupId: 'not-a-uuid',
        positionKey: 'parliamentarian',
      });

      expect(result).toEqual({ error: 'Pick a division.' });
    });

    it('rejects a division that no longer exists', async () => {
      prisma.allocationGroup.findUnique.mockResolvedValue(null);
      prisma.positionDivisionAccess.findUnique.mockResolvedValue(null);

      const result = await addDivisionAccess({
        allocationGroupId: GROUP_ID,
        positionKey: 'parliamentarian',
      });

      expect(result).toEqual({ error: 'That division no longer exists.' });
      expect(prisma.positionDivisionAccess.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate assignment with an actionable message', async () => {
      prisma.allocationGroup.findUnique.mockResolvedValue({ name: 'Events' });
      prisma.positionDivisionAccess.findUnique.mockResolvedValue({
        id: ASSIGNMENT_ID,
      });

      const result = await addDivisionAccess({
        allocationGroupId: GROUP_ID,
        positionKey: 'parliamentarian',
      });

      expect(result).toEqual({
        error: 'parliamentarian is already assigned to Events.',
      });
      expect(prisma.positionDivisionAccess.create).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('trims the key, creates the assignment and revalidates', async () => {
      prisma.allocationGroup.findUnique.mockResolvedValue({ name: 'Events' });
      prisma.positionDivisionAccess.findUnique.mockResolvedValue(null);
      prisma.positionDivisionAccess.create.mockResolvedValue({
        id: ASSIGNMENT_ID,
      });

      await addDivisionAccess({
        allocationGroupId: GROUP_ID,
        positionKey: '  parliamentarian ',
      });

      expect(prisma.positionDivisionAccess.create).toHaveBeenCalledWith({
        data: { positionKey: 'parliamentarian', allocationGroupId: GROUP_ID },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/divisions/access');
      expect(revalidatePath).toHaveBeenCalledWith('/divisions');
    });
  });

  describe('removeDivisionAccess', () => {
    beforeEach(() => {
      requireSession.mockResolvedValue(editor());
    });

    it('rejects a malformed id', async () => {
      const result = await removeDivisionAccess({ id: 'nope' });

      expect(result).toEqual({ error: 'Invalid assignment.' });
      expect(prisma.positionDivisionAccess.deleteMany).not.toHaveBeenCalled();
    });

    it('reports an assignment that was already removed', async () => {
      prisma.positionDivisionAccess.deleteMany.mockResolvedValue({ count: 0 });

      const result = await removeDivisionAccess({ id: ASSIGNMENT_ID });

      expect(result).toEqual({ error: 'That assignment was already removed.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('deletes the assignment and revalidates', async () => {
      prisma.positionDivisionAccess.deleteMany.mockResolvedValue({ count: 1 });

      const result = await removeDivisionAccess({ id: ASSIGNMENT_ID });

      expect(result).toEqual({ id: ASSIGNMENT_ID });
      expect(prisma.positionDivisionAccess.deleteMany).toHaveBeenCalledWith({
        where: { id: ASSIGNMENT_ID },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/divisions');
    });
  });
});
