import type { SgaSession } from '@nusgaops/sgauth';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  ForbiddenError,
  hasCapability,
  requireCapability,
} from '@/lib/permissions';

const { requireSession } = vi.hoisted(() => ({ requireSession: vi.fn() }));

vi.mock('@nusgaops/sgauth/next', () => ({ requireSession }));

const EDITOR_POSITIONS = [
  'executive-vice-president',
  'vice-president-of-operational-affairs',
  'comptroller',
];

const VIEWER_POSITIONS = [
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

// Branches that still have the passphrase flag bypass permissions unless it is
// set. Remove this once the flag is gone (#748).
beforeAll(() => {
  process.env.SGAUTH_ENABLED = 'true';
});

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
    requireSession.mockResolvedValue(sessionWith('senator'));

    await expect(requireCapability('edit')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('allows a viewer to view', async () => {
    requireSession.mockResolvedValue(sessionWith('senator'));

    await expect(requireCapability('view')).resolves.toBeUndefined();
  });
});
