import { requireSession } from '@nusgaops/sgauth/next';
import { cache } from 'react';

import type { SgaSession } from '@nusgaops/sgauth';

import { User } from '@/prisma/client';
import { ensurePurchaserForSession } from '@/prisma/services/purchaser';

import { ForbiddenError, hasCapability } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { canRequestWholeIndex } from '@/lib/purchase-request';

export interface RequestAccess {
  session: SgaSession;
  user: User;
  canView: boolean;
  canEdit: boolean;
  // Can submit requests: holds a position listed in RequesterPosition, or can
  // request against a whole index.
  canRequest: boolean;
  // Can open the request page: a viewer (reads every request), a requester,
  // an E-Board purchaser (who reviews the requests naming them), or a
  // divisional head (who reviews their division's requests).
  canUseRequests: boolean;
  // Allocation group (division) ids the user may request against.
  divisionIds: 'all' | string[];
  // Designation (index) ids the user may request against as a whole.
  indexIds: string[];
}

// Submitting needs a position listed in RequesterPosition, or access to a
// whole index. Editors can request against every division; everyone else only
// against the divisions mapped to their positions through
// PositionDivisionAccess. Whole-index access follows each index's mode.
export const getRequestAccess = cache(async (): Promise<RequestAccess> => {
  const session = await requireSession();
  const canView = hasCapability(session, 'view');
  const canEdit = hasCapability(session, 'edit');
  const positionKeys = session.positions.map((p) => p.key);

  const [user, requesterPositions, divisionRows, headedDivisions, indexes] =
    await Promise.all([
      ensurePurchaserForSession(session),
      prisma.requesterPosition.count({
        where: { positionKey: { in: positionKeys } },
      }),
      canEdit
        ? Promise.resolve([])
        : prisma.positionDivisionAccess.findMany({
            where: { positionKey: { in: positionKeys } },
            select: {
              allocationGroupId: true,
              allocationGroup: {
                select: { designation: { select: { isBudgetIndex: true } } },
              },
            },
          }),
      prisma.allocationGroup.count({
        where: { headPositionKey: { in: positionKeys } },
      }),
      prisma.designation.findMany({
        where: {
          OR: [
            { requestAccess: { not: 'ALLOCATIONS_ONLY' } },
            { headPositionKey: { in: positionKeys } },
          ],
        },
        select: {
          id: true,
          requestAccess: true,
          headPositionKey: true,
          requesterPositions: { select: { positionKey: true } },
        },
      }),
    ]);

  const isRequester = requesterPositions > 0;
  const canRequestBudgetIndex =
    isRequester &&
    (canEdit ||
      divisionRows.some((r) => r.allocationGroup.designation.isBudgetIndex));
  const indexIds = indexes
    .filter((index) =>
      canRequestWholeIndex({
        access: index.requestAccess,
        isEditor: canEdit,
        canRequestBudgetIndex,
        positionKeys,
        listedPositionKeys: index.requesterPositions.map((p) => p.positionKey),
      }),
    )
    .map((index) => index.id);
  const headsAnIndex = indexes.some(
    (index) =>
      index.headPositionKey !== null &&
      positionKeys.includes(index.headPositionKey),
  );

  return {
    session,
    user,
    canView,
    canEdit,
    canRequest: isRequester || indexIds.length > 0,
    canUseRequests:
      canView ||
      isRequester ||
      indexIds.length > 0 ||
      user.isEBoardPurchaser ||
      headedDivisions > 0 ||
      headsAnIndex,
    divisionIds: canEdit
      ? 'all'
      : [...new Set(divisionRows.map((r) => r.allocationGroupId))],
    indexIds,
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

export function canUseIndex(
  access: RequestAccess,
  designationId: string,
): boolean {
  return access.indexIds.includes(designationId);
}
