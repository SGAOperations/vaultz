import type { SgaSession } from '@nusgaops/sgauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ForbiddenError,
  allowedRequestActions,
  getVisibleDivisionIds,
  hasCapability,
  isRequestApprover,
  requireCapability,
  resolveVisibleDivisionIds,
} from '@/lib/permissions';

const { prisma, requireSession } = vi.hoisted(() => ({
  prisma: { positionDivisionAccess: { findMany: vi.fn() } },
  requireSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));
vi.mock('@nusgaops/sgauth/next', () => ({ requireSession }));

const EDITOR_POSITIONS = [
  'executive-vice-president',
  'vice-president-of-operational-affairs',
  'comptroller',
];

const VIEWER_POSITIONS = [
  'student-body-president',
  'speaker-of-the-senate',
  'parliamentarian',
  'vice-president-of-academic-affairs',
  'vice-president-of-campus-affairs',
  'vice-president-of-diversity-equity-and-inclusion',
  'vice-president-of-external-affairs',
  'vice-president-of-student-involvement',
  'vice-president-of-student-success',
];

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

describe('hasCapability', () => {
  it.each(EDITOR_POSITIONS)('grants view and edit to %s', (position) => {
    const session = sessionWith(position);

    expect(hasCapability(session, 'view')).toBe(true);
    expect(hasCapability(session, 'edit')).toBe(true);
  });

  it.each(VIEWER_POSITIONS)('grants view only to %s', (position) => {
    const session = sessionWith(position);

    expect(hasCapability(session, 'view')).toBe(true);
    expect(hasCapability(session, 'edit')).toBe(false);
  });

  it('denies both capabilities to a senator', () => {
    const session = sessionWith('senator');

    expect(hasCapability(session, 'view')).toBe(false);
    expect(hasCapability(session, 'edit')).toBe(false);
  });

  it('denies both capabilities to a position outside the map', () => {
    const session = sessionWith('director-of-campus-services');

    expect(hasCapability(session, 'view')).toBe(false);
    expect(hasCapability(session, 'edit')).toBe(false);
  });

  it('denies both capabilities when the session holds no positions', () => {
    const session = sessionWith();

    expect(hasCapability(session, 'view')).toBe(false);
    expect(hasCapability(session, 'edit')).toBe(false);
  });

  it('denies both capabilities without a session', () => {
    expect(hasCapability(null, 'view')).toBe(false);
    expect(hasCapability(undefined, 'edit')).toBe(false);
  });
});

describe('requireCapability', () => {
  it('allows an editor to edit', async () => {
    requireSession.mockResolvedValue(sessionWith('comptroller'));

    await expect(requireCapability('edit')).resolves.toBeUndefined();
  });

  it('rejects a viewer who tries to edit', async () => {
    requireSession.mockResolvedValue(sessionWith('parliamentarian'));

    await expect(requireCapability('edit')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('allows a viewer to view', async () => {
    requireSession.mockResolvedValue(sessionWith('parliamentarian'));

    await expect(requireCapability('view')).resolves.toBeUndefined();
  });
});

describe('allowedRequestActions', () => {
  const comptroller = sessionWith('comptroller');
  const vpoa = sessionWith('vice-president-of-operational-affairs');
  const evp = sessionWith('executive-vice-president');
  const requester = sessionWith('vice-president-of-campus-affairs');

  it('lets the Comptroller approve, reject or escalate a pending request', () => {
    expect(
      allowedRequestActions({
        session: comptroller,
        status: 'PENDING',
        isOwner: false,
      }).sort(),
    ).toEqual(['approve', 'escalate', 'reject']);
  });

  it('hides approve and reject from the Comptroller once escalated', () => {
    expect(
      allowedRequestActions({
        session: comptroller,
        status: 'ESCALATED',
        isOwner: false,
      }).sort(),
    ).toEqual(['resend', 'return']);
  });

  it.each(['PENDING', 'ESCALATED'] as const)(
    'lets the VPOA approve or reject a %s request',
    (status) => {
      expect(
        allowedRequestActions({ session: vpoa, status, isOwner: false }).sort(),
      ).toEqual(['approve', 'reject']);
    },
  );

  it.each(['PENDING', 'ESCALATED', 'APPROVED'] as const)(
    'gives the EVP nothing on a %s request',
    (status) => {
      expect(
        allowedRequestActions({ session: evp, status, isOwner: false }),
      ).toEqual([]);
    },
  );

  it('lets the owner edit or cancel only while pending', () => {
    expect(
      allowedRequestActions({
        session: requester,
        status: 'PENDING',
        isOwner: true,
      }).sort(),
    ).toEqual(['cancel', 'edit']);
    expect(
      allowedRequestActions({
        session: requester,
        status: 'ESCALATED',
        isOwner: true,
      }),
    ).toEqual([]);
  });

  it('gives a non-owner requester nothing', () => {
    expect(
      allowedRequestActions({
        session: requester,
        status: 'PENDING',
        isOwner: false,
      }),
    ).toEqual([]);
  });

  it.each(['APPROVED', 'REJECTED', 'CANCELLED'] as const)(
    'allows nothing on a %s request, even for the VPOA',
    (status) => {
      expect(
        allowedRequestActions({ session: vpoa, status, isOwner: true }),
      ).toEqual([]);
    },
  );

  it('lets a Comptroller who owns the request act as both', () => {
    expect(
      allowedRequestActions({
        session: comptroller,
        status: 'PENDING',
        isOwner: true,
      }).sort(),
    ).toEqual(['approve', 'cancel', 'edit', 'escalate', 'reject']);
  });
});

describe('isRequestApprover', () => {
  it('is true only for the Comptroller and the VPOA', () => {
    expect(isRequestApprover(sessionWith('comptroller'))).toBe(true);
    expect(
      isRequestApprover(sessionWith('vice-president-of-operational-affairs')),
    ).toBe(true);
    expect(isRequestApprover(sessionWith('executive-vice-president'))).toBe(
      false,
    );
  });
});

function mappingsFor(...ids: string[]) {
  return ids.map((allocationGroupId) => ({ allocationGroupId }));
}

describe('resolveVisibleDivisionIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(EDITOR_POSITIONS)('returns all divisions to %s', async (position) => {
    await expect(
      resolveVisibleDivisionIds(sessionWith(position)),
    ).resolves.toBe('all');
    expect(prisma.positionDivisionAccess.findMany).not.toHaveBeenCalled();
  });

  it('returns only the divisions mapped to a viewer position', async () => {
    prisma.positionDivisionAccess.findMany.mockResolvedValue(
      mappingsFor('group-1', 'group-2'),
    );

    await expect(
      resolveVisibleDivisionIds(
        sessionWith('vice-president-of-campus-affairs'),
      ),
    ).resolves.toEqual(['group-1', 'group-2']);
    expect(prisma.positionDivisionAccess.findMany).toHaveBeenCalledWith({
      where: { positionKey: { in: ['vice-president-of-campus-affairs'] } },
      select: { allocationGroupId: true },
    });
  });

  it('unions and dedupes divisions across viewer positions', async () => {
    prisma.positionDivisionAccess.findMany.mockResolvedValue(
      mappingsFor('group-1', 'group-2', 'group-2', 'group-3'),
    );

    await expect(
      resolveVisibleDivisionIds(
        sessionWith('speaker-of-the-senate', 'parliamentarian'),
      ),
    ).resolves.toEqual(['group-1', 'group-2', 'group-3']);
    expect(prisma.positionDivisionAccess.findMany).toHaveBeenCalledWith({
      where: {
        positionKey: { in: ['speaker-of-the-senate', 'parliamentarian'] },
      },
      select: { allocationGroupId: true },
    });
  });

  it('returns no divisions when a viewer has no mappings', async () => {
    prisma.positionDivisionAccess.findMany.mockResolvedValue([]);

    await expect(
      resolveVisibleDivisionIds(sessionWith('speaker-of-the-senate')),
    ).resolves.toEqual([]);
  });

  it('ignores positions that cannot view', async () => {
    prisma.positionDivisionAccess.findMany.mockResolvedValue(
      mappingsFor('group-1'),
    );

    await resolveVisibleDivisionIds(
      sessionWith('director-of-campus-services', 'speaker-of-the-senate'),
    );

    expect(prisma.positionDivisionAccess.findMany).toHaveBeenCalledWith({
      where: { positionKey: { in: ['speaker-of-the-senate'] } },
      select: { allocationGroupId: true },
    });
  });

  it('rejects a session without a view position', async () => {
    await expect(
      resolveVisibleDivisionIds(sessionWith('director-of-campus-services')),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(resolveVisibleDivisionIds(null)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(prisma.positionDivisionAccess.findMany).not.toHaveBeenCalled();
  });
});

describe('getVisibleDivisionIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves divisions for the current session', async () => {
    requireSession.mockResolvedValue(sessionWith('speaker-of-the-senate'));
    prisma.positionDivisionAccess.findMany.mockResolvedValue(
      mappingsFor('group-1'),
    );

    await expect(getVisibleDivisionIds()).resolves.toEqual(['group-1']);
    expect(requireSession).toHaveBeenCalled();
  });

  it('rejects the current session without a view position', async () => {
    requireSession.mockResolvedValue(sessionWith());

    await expect(getVisibleDivisionIds()).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
