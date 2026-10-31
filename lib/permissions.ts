import { requireSession } from '@nusgaops/sgauth/next';

import { type MaybeSession, hasAnyPosition } from '@nusgaops/sgauth';

import { isSgauthEnabled } from '@/lib/sgauth';

export type Capability = 'view' | 'edit';

// The only place SGAuth position keys appear in VaultZ. Keys come from the
// curated list in SGAOperations/auth (prisma/seed/positions.json). Anyone
// holding none of these positions has no access at all.
const EDITORS = [
  'executive-vice-president',
  'vice-president-of-operational-affairs',
  'comptroller',
];

const VIEWERS = [
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

const CAPABILITY_POSITIONS: Record<Capability, readonly string[]> = {
  edit: EDITORS,
  view: [...EDITORS, ...VIEWERS],
};

export function hasCapability(
  session: MaybeSession,
  capability: Capability,
): boolean {
  return hasAnyPosition(session, CAPABILITY_POSITIONS[capability]);
}

export class ForbiddenError extends Error {
  constructor(capability: Capability) {
    super(`You do not have permission to ${capability} in VaultZ.`);
    this.name = 'ForbiddenError';
  }
}

// Every server action calls this first. Under the passphrase gate there is no
// per-user identity, so everything stays allowed until the SGAuth cutover.
export async function requireCapability(capability: Capability): Promise<void> {
  if (!isSgauthEnabled()) return;

  const session = await requireSession();
  if (!hasCapability(session, capability)) throw new ForbiddenError(capability);
}

export async function getCapabilities(): Promise<Record<Capability, boolean>> {
  if (!isSgauthEnabled()) return { view: true, edit: true };

  const session = await requireSession();
  return {
    view: hasCapability(session, 'view'),
    edit: hasCapability(session, 'edit'),
  };
}
