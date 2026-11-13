import { requireSession } from '@nusgaops/sgauth/next';

import { type MaybeSession, hasAnyPosition } from '@nusgaops/sgauth';

import type { PurchaseRequestStatus } from '@/prisma/client';

import prisma from '@/lib/prisma';

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
  | 'purchaserApprove'
  | 'sendBack'
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'return'
  | 'resend';

// A request first waits on its E-Board purchaser, then on the Comptroller,
// who can escalate it to the VPOA (hiding their own decisions until they
// return it). The VPOA can decide any open request at any stage. Every
// reviewer's default decline is sending it back for revision; rejecting ends
// it. The requester can edit or cancel until the purchaser approves. The EVP
// has no request powers.
export function allowedRequestActions({
  session,
  status,
  isOwner,
  isPurchaser,
}: {
  session: MaybeSession;
  status: PurchaseRequestStatus;
  isOwner: boolean;
  isPurchaser: boolean;
}): RequestAction[] {
  const isComptroller = hasAnyPosition(session, [COMPTROLLER]);
  const isVpoa = hasAnyPosition(session, [VPOA]);
  const actions = new Set<RequestAction>();
  const add = (...list: RequestAction[]) => list.forEach((a) => actions.add(a));

  const beforePurchaserApproval =
    status === 'PURCHASER_REVIEW' || status === 'NEEDS_REVISION';

  if (beforePurchaserApproval && isOwner) add('edit', 'cancel');

  if (status === 'PURCHASER_REVIEW' && isPurchaser)
    add('purchaserApprove', 'sendBack', 'reject');

  if (status === 'PENDING' && isComptroller)
    add('approve', 'sendBack', 'escalate', 'reject');

  if (status === 'ESCALATED' && isComptroller) add('return', 'resend');

  if (isVpoa && status !== 'NEEDS_REVISION' && isOpenStatus(status))
    add('approve', 'sendBack', 'reject');
  if (isVpoa && status === 'NEEDS_REVISION') add('approve', 'reject');

  return [...actions];
}

function isOpenStatus(status: PurchaseRequestStatus): boolean {
  return (
    status === 'PURCHASER_REVIEW' ||
    status === 'NEEDS_REVISION' ||
    status === 'PENDING' ||
    status === 'ESCALATED'
  );
}

export function isRequestApprover(session: MaybeSession): boolean {
  return hasAnyPosition(session, [COMPTROLLER, VPOA]);
}

export type VisibleDivisions = 'all' | string[];

// Editors see every division. Other viewers see only the divisions mapped to
// their view-capable positions; unmapped divisions stay hidden.
export async function resolveVisibleDivisionIds(
  session: MaybeSession,
): Promise<VisibleDivisions> {
  if (!hasCapability(session, 'view')) throw new ForbiddenError('view');
  if (hasCapability(session, 'edit')) return 'all';

  const positionKeys = (session?.positions ?? [])
    .map((position) => position.key)
    .filter((key) => CAPABILITY_POSITIONS.view.includes(key));

  const mappings = await prisma.positionDivisionAccess.findMany({
    where: { positionKey: { in: positionKeys } },
    select: { allocationGroupId: true },
  });

  return [...new Set(mappings.map((mapping) => mapping.allocationGroupId))];
}

export async function getVisibleDivisionIds(): Promise<VisibleDivisions> {
  const session = await requireSession();
  return resolveVisibleDivisionIds(session);
}
