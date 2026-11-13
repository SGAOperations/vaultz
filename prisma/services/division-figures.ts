'use server';

import { Decimal } from '@/prisma/client/runtime/client';

import { getVisibleDivisionIds } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { DivisionFigures } from '@/lib/types';

// Resolves visibility from the session, never from arguments, since server
// actions can be called from the browser with anything.
export async function getDivisionFigures(
  yearId: string,
): Promise<DivisionFigures[]> {
  const visible = await getVisibleDivisionIds();
  if (visible !== 'all' && visible.length === 0) return [];

  const groups = await prisma.allocationGroup.findMany({
    where: visible === 'all' ? undefined : { id: { in: visible } },
    select: {
      id: true,
      name: true,
      designationId: true,
      designation: { select: { code: true, name: true } },
      allocations: {
        where: { deletedAt: null, period: { yearId, deletedAt: null } },
        select: {
          amount: true,
          purchases: {
            where: { deletedAt: null, excludeFromTotal: false },
            select: {
              amount: true,
              reimbursed: true,
              expenseReportCreated: true,
            },
          },
        },
      },
    },
    orderBy: [{ designation: { code: 'asc' } }, { name: 'asc' }],
  });

  return groups.map((group) => {
    let allocated = new Decimal(0);
    let spent = new Decimal(0);
    let notReimbursedCount = 0;
    let noExpenseReportCount = 0;

    for (const allocation of group.allocations) {
      allocated = allocated.plus(allocation.amount);
      for (const purchase of allocation.purchases) {
        spent = spent.plus(purchase.amount);
        if (!purchase.reimbursed) notReimbursedCount++;
        if (!purchase.expenseReportCreated) noExpenseReportCount++;
      }
    }

    return {
      allocationGroupId: group.id,
      name: group.name,
      designationId: group.designationId,
      designationCode: group.designation.code,
      designationName: group.designation.name,
      allocatedTotal: allocated.toNumber(),
      spentTotal: spent.toNumber(),
      remaining: allocated.minus(spent).toNumber(),
      notReimbursedCount,
      noExpenseReportCount,
    };
  });
}
