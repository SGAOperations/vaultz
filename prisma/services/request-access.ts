import { requireSession } from '@nusgaops/sgauth/next';
import { cache } from 'react';

import type { SgaSession } from '@nusgaops/sgauth';

import { User } from '@/prisma/client';
import { ensurePurchaserForSession } from '@/prisma/services/purchaser';

import { ForbiddenError, hasCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export interface RequestAccess {
  session: SgaSession;
  user: User;
  canView: boolean;
  canEdit: boolean;
  // Can submit requests: holds a position listed in RequesterPosition.
  canRequest: boolean;
  // Can open the request page: a viewer (reads every request) or a requester.
  canUseRequests: boolean;
  // Allocation group (division) ids the user may request against.
  divisionIds: 'all' | string[];
}

// Submitting needs a position listed in RequesterPosition. Editors can request
// against every division; everyone else only against the divisions mapped to
// their positions through PositionDivisionAccess.
export const getRequestAccess = cache(async (): Promise<RequestAccess> => {
  const session = await requireSession();
  const canView = hasCapability(session, 'view');
  const canEdit = hasCapability(session, 'edit');
  const positionKeys = session.positions.map((p) => p.key);

  const [user, requesterPositions, divisionRows] = await Promise.all([
    ensurePurchaserForSession(session),
    prisma.requesterPosition.count({
      where: { positionKey: { in: positionKeys } },
    }),
    canEdit
      ? Promise.resolve([])
      : prisma.positionDivisionAccess.findMany({
          where: { positionKey: { in: positionKeys } },
          select: { allocationGroupId: true },
        }),
  ]);

  return {
    session,
    user,
    canView,
    canEdit,
    canRequest: requesterPositions > 0,
    canUseRequests: canView || requesterPositions > 0,
    divisionIds: canEdit
      ? 'all'
      : [...new Set(divisionRows.map((r) => r.allocationGroupId))],
  };
});

export async function requireRequestAccess(): Promise<RequestAccess> {
  const access = await getRequestAccess();
  if (!access.canUseRequests) throw new ForbiddenError('use purchase requests');
  return access;
}

export async function requireSubmitAccess(): Promise<RequestAccess> {
  const access = await getRequestAccess();
  if (!access.canRequest) throw new ForbiddenError('submit purchase requests');
  return access;
}

export function canUseDivision(
  access: RequestAccess,
  allocationGroupId: string | null,
): boolean {
  if (access.divisionIds === 'all') return true;
  return (
    allocationGroupId !== null && access.divisionIds.includes(allocationGroupId)
  );
}
