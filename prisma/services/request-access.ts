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
  canRequest: boolean;
  // Allocation group (division) ids the user may request against.
  divisionIds: 'all' | string[];
}

// Editors can request against every division. Other positions need a row in
// RequesterPosition to submit, and only see divisions mapped to them through
// PositionDivisionAccess.
export const getRequestAccess = cache(async (): Promise<RequestAccess> => {
  const session = await requireSession();
  const canView = hasCapability(session, 'view');
  const canEdit = hasCapability(session, 'edit');
  const positionKeys = session.positions.map((p) => p.key);

  const [user, requesterPositions, divisionRows] = await Promise.all([
    ensurePurchaserForSession(session),
    canView
      ? Promise.resolve(0)
      : prisma.requesterPosition.count({
          where: { positionKey: { in: positionKeys } },
        }),
    canView
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
    canRequest: canView || requesterPositions > 0,
    divisionIds: canView
      ? 'all'
      : [...new Set(divisionRows.map((r) => r.allocationGroupId))],
  };
});

export async function requireRequestAccess(): Promise<RequestAccess> {
  const access = await getRequestAccess();
  if (!access.canRequest) throw new ForbiddenError('use purchase requests');
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
