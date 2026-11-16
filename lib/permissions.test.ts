import type { SgaSession } from '@nusgaops/sgauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PurchaseRequestStatus } from '@/prisma/client';

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
  const vp = sessionWith('vice-president-of-campus-affairs');

  const actions = (
    session: SgaSession,
    status: PurchaseRequestStatus,
    { isOwner = false, isPurchaser = false, isSignedOff = false } = {},
  ) =>
    allowedRequestActions({
      session,
      status,
      isOwner,
      isPurchaser,
      isSignedOff,
    }).sort();

  describe('awaiting the purchaser', () => {
    it('lets the purchaser approve, send back or reject', () => {
      expect(actions(vp, 'PURCHASER_REVIEW', { isPurchaser: true })).toEqual([
        'purchaserApprove',
        'reject',
        'sendBack',
      ]);
    });

    it('lets the requester edit or cancel', () => {
      expect(actions(vp, 'PURCHASER_REVIEW', { isOwner: true })).toEqual([
        'cancel',
        'edit',
      ]);
    });

    it('gives the Comptroller nothing yet', () => {
      expect(actions(comptroller, 'PURCHASER_REVIEW')).toEqual([]);
    });

    it('lets the VPOA override', () => {
      expect(actions(vpoa, 'PURCHASER_REVIEW')).toEqual([
        'approve',
        'reject',
        'sendBack',
      ]);
    });
  });

  describe('needing revision', () => {
    it('lets the requester edit or cancel', () => {
      expect(actions(vp, 'NEEDS_REVISION', { isOwner: true })).toEqual([
        'cancel',
        'edit',
      ]);
    });

    it('gives the purchaser and the Comptroller nothing', () => {
      expect(actions(vp, 'NEEDS_REVISION', { isPurchaser: true })).toEqual([]);
      expect(actions(comptroller, 'NEEDS_REVISION')).toEqual([]);
    });

    it('lets the VPOA approve or reject, but not send back again', () => {
      expect(actions(vpoa, 'NEEDS_REVISION')).toEqual(['approve', 'reject']);
    });
  });

  describe('pending', () => {
    it('lets the Comptroller approve, send back, escalate or reject', () => {
      expect(actions(comptroller, 'PENDING')).toEqual([
        'approve',
        'escalate',
        'reject',
        'sendBack',
      ]);
    });

    it('locks the request for the requester and the purchaser', () => {
      expect(
        actions(vp, 'PENDING', { isOwner: true, isPurchaser: true }),
      ).toEqual([]);
    });

    it('lets the VPOA approve, send back or reject', () => {
      expect(actions(vpoa, 'PENDING')).toEqual([
        'approve',
        'reject',
        'sendBack',
      ]);
    });
  });

  describe('escalated', () => {
    it('leaves the Comptroller only return and resend', () => {
      expect(actions(comptroller, 'ESCALATED')).toEqual(['resend', 'return']);
    });

    it('lets the VPOA approve, send back or reject', () => {
      expect(actions(vpoa, 'ESCALATED')).toEqual([
        'approve',
        'reject',
        'sendBack',
      ]);
    });
  });

  it.each([
    'PURCHASER_REVIEW',
    'NEEDS_REVISION',
    'PENDING',
    'ESCALATED',
    'APPROVED',
  ] as const)('gives the EVP nothing on a %s request', (status) => {
    expect(actions(evp, status)).toEqual([]);
  });

  describe('approved', () => {
    it('lets the VPOA sign off or revoke until signed off', () => {
      expect(actions(vpoa, 'APPROVED')).toEqual(['revoke', 'signOff']);
      expect(actions(vpoa, 'APPROVED', { isSignedOff: true })).toEqual([]);
    });

    it('gives the Comptroller, requester and purchaser nothing', () => {
      expect(actions(comptroller, 'APPROVED')).toEqual([]);
      expect(
        actions(vp, 'APPROVED', { isOwner: true, isPurchaser: true }),
      ).toEqual([]);
    });
  });

  it.each(['REJECTED', 'CANCELLED', 'REVOKED'] as const)(
    'allows nothing on a %s request, even for the VPOA',
    (status) => {
      expect(
        actions(vpoa, status, { isOwner: true, isPurchaser: true }),
      ).toEqual([]);
    },
  );

  it('lets a Comptroller who owns a pending request only decide it', () => {
    expect(actions(comptroller, 'PENDING', { isOwner: true })).toEqual([
      'approve',
      'escalate',
      'reject',
      'sendBack',
    ]);
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
