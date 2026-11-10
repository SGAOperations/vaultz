import { requireSession } from '@nusgaops/sgauth/next';

import { type MaybeSession, hasAnyPosition } from '@nusgaops/sgauth';

import type { PurchaseRequestStatus } from '@/prisma/client';

export type Capability = 'view' | 'edit';

// The only place SGAuth position keys appear in VaultZ. Keys come from the
// curated list in SGAOperations/auth (prisma/seed/positions.json). Anyone
// holding none of these positions can only use purchase requests, and only
// when an editor has listed their position as a requester position.
export const COMPTROLLER = 'comptroller';
export const VPOA = 'vice-president-of-operational-affairs';

const EDITORS = ['executive-vice-president', VPOA, COMPTROLLER];

const VIEWERS = [
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
  constructor(capability: string) {
    super(`You do not have permission to ${capability} in VaultZ.`);
    this.name = 'ForbiddenError';
  }
}

// Every server action calls this first.
export async function requireCapability(capability: Capability): Promise<void> {
  const session = await requireSession();
  if (!hasCapability(session, capability)) throw new ForbiddenError(capability);
}

export async function getCapabilities(): Promise<Record<Capability, boolean>> {
  const session = await requireSession();
  return {
    view: hasCapability(session, 'view'),
    edit: hasCapability(session, 'edit'),
  };
}

export type RequestAction =
  | 'edit'
  | 'cancel'
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'return'
  | 'resend';

// The Comptroller decides pending requests and can escalate them to the VPOA,
// which hides their approve/reject until they return the request. The VPOA can
// decide any open request at any time. The EVP has no request powers.
export function allowedRequestActions({
  session,
  status,
  isOwner,
}: {
  session: MaybeSession;
  status: PurchaseRequestStatus;
  isOwner: boolean;
}): RequestAction[] {
  const isComptroller = hasAnyPosition(session, [COMPTROLLER]);
  const isVpoa = hasAnyPosition(session, [VPOA]);
  const actions = new Set<RequestAction>();

  if (status === 'PENDING') {
    if (isOwner) {
      actions.add('edit');
      actions.add('cancel');
    }
    if (isComptroller) {
      actions.add('approve');
      actions.add('reject');
      actions.add('escalate');
    }
  }

  if (status === 'ESCALATED' && isComptroller) {
    actions.add('return');
    actions.add('resend');
  }

  if ((status === 'PENDING' || status === 'ESCALATED') && isVpoa) {
    actions.add('approve');
    actions.add('reject');
  }

  return [...actions];
}

export function isRequestApprover(session: MaybeSession): boolean {
  return hasAnyPosition(session, [COMPTROLLER, VPOA]);
}
