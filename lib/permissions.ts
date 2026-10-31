import { requireSession } from '@nusgaops/sgauth/next';

import { type MaybeSession, hasAnyPosition } from '@nusgaops/sgauth';

import { isSgauthEnabled } from '@/lib/sgauth';

export type Capability = 'view' | 'edit';

// The only place SGAuth position keys appear in VaultZ. Keys come from the
// curated list in SGAOperations/auth (prisma/seed/positions.json). Anyone
// holding none of these positions has no access at all.
const EDITORS = ['vice-president-of-operational-affairs', 'comptroller'];

const CAPABILITY_POSITIONS: Record<Capability, readonly string[]> = {
  edit: EDITORS,
  view: [...EDITORS, 'student-body-president', 'executive-vice-president'],
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
