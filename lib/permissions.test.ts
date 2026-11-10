import type { SgaSession } from '@nusgaops/sgauth';
import { describe, expect, it, vi } from 'vitest';

import {
  ForbiddenError,
  allowedRequestActions,
  hasCapability,
  isRequestApprover,
  requireCapability,
} from '@/lib/permissions';

const { requireSession } = vi.hoisted(() => ({ requireSession: vi.fn() }));

vi.mock('@nusgaops/sgauth/next', () => ({ requireSession }));

const EDITOR_POSITIONS = [
  'executive-vice-president',
  'vice-president-of-operational-affairs',
  'comptroller',
];

// Leadership positions that used to be view-only. They now reach VaultZ only
// through the request page, when listed as requester positions.
const LEADERSHIP_POSITIONS = [
  'student-body-president',
  'speaker-of-the-senate',
  'senator',
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

  it.each(LEADERSHIP_POSITIONS)('denies view and edit to %s', (position) => {
    const session = sessionWith(position);

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

  it('rejects a leadership position that tries to view', async () => {
    requireSession.mockResolvedValue(
      sessionWith('vice-president-of-campus-affairs'),
    );

    await expect(requireCapability('view')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
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
