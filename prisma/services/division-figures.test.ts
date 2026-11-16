import type { SgaSession } from '@nusgaops/sgauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Decimal } from '@/prisma/client/runtime/client';
import { getDivisionFigures } from '@/prisma/services/division-figures';

import { ForbiddenError } from '@/lib/permissions';

const { prisma, requireSession } = vi.hoisted(() => ({
  prisma: {
    allocationGroup: { findMany: vi.fn() },
    positionDivisionAccess: { findMany: vi.fn() },
  },
  requireSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: prisma }));
vi.mock('@nusgaops/sgauth/next', () => ({ requireSession }));

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

function purchase(
  amount: string,
  reimbursed: boolean,
  expenseReportCreated: boolean,
) {
  return { amount: new Decimal(amount), reimbursed, expenseReportCreated };
}

const designation = { code: 'SGA', name: 'Student Government' };

// Rows as Prisma returns them after the nested where filters are applied.
const sampleGroups = [
  {
    id: 'group-events',
    name: 'Events',
    designationId: 'des-1',
    designation,
    allocations: [
      {
        amount: new Decimal('100.10'),
        purchases: [
          purchase('12.50', false, true),
          purchase('0.10', true, false),
        ],
      },
      {
        amount: new Decimal('50.20'),
        purchases: [purchase('0.20', false, false)],
      },
    ],
  },
  {
    id: 'group-outreach',
    name: 'Outreach',
    designationId: 'des-1',
    designation,
    allocations: [{ amount: new Decimal('200'), purchases: [] }],
  },
  {
    id: 'group-empty',
    name: 'Unfunded',
    designationId: 'des-1',
    designation,
    allocations: [],
  },
];

describe('getDivisionFigures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a user without view capability and queries nothing', async () => {
    requireSession.mockResolvedValue(sessionWith('some-other-position'));

    await expect(getDivisionFigures('year-1')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(prisma.allocationGroup.findMany).not.toHaveBeenCalled();
    expect(prisma.positionDivisionAccess.findMany).not.toHaveBeenCalled();
  });

  it('filters by year and excludes deleted and excluded-from-total rows', async () => {
    requireSession.mockResolvedValue(sessionWith('comptroller'));
    prisma.allocationGroup.findMany.mockResolvedValue([]);

    await getDivisionFigures('year-1');

    const args = prisma.allocationGroup.findMany.mock.calls[0][0];
    expect(args.where).toBeUndefined();
    expect(args.select.allocations.where).toEqual({
      deletedAt: null,
      period: { yearId: 'year-1', deletedAt: null },
    });
    expect(args.select.allocations.select.purchases.where).toEqual({
      deletedAt: null,
      excludeFromTotal: false,
    });
    expect(args.orderBy).toEqual([
      { designation: { code: 'asc' } },
      { name: 'asc' },
    ]);
  });

  it('returns every division to an editor without reading mappings', async () => {
    requireSession.mockResolvedValue(sessionWith('comptroller'));
    prisma.allocationGroup.findMany.mockResolvedValue([]);

    await getDivisionFigures('year-1');

    expect(prisma.positionDivisionAccess.findMany).not.toHaveBeenCalled();
    expect(
      prisma.allocationGroup.findMany.mock.calls[0][0].where,
    ).toBeUndefined();
  });

  it("restricts a viewer to its position's mapped divisions", async () => {
    requireSession.mockResolvedValue(sessionWith('parliamentarian'));
    prisma.positionDivisionAccess.findMany.mockResolvedValue([
      { allocationGroupId: 'group-events' },
    ]);
    prisma.allocationGroup.findMany.mockResolvedValue([]);

    await getDivisionFigures('year-1');

    expect(prisma.positionDivisionAccess.findMany).toHaveBeenCalledWith({
      where: { positionKey: { in: ['parliamentarian'] } },
      select: { allocationGroupId: true },
    });
    expect(prisma.allocationGroup.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ['group-events'] },
    });
  });

  it('returns nothing to a viewer with no mapped divisions', async () => {
    requireSession.mockResolvedValue(sessionWith('parliamentarian'));
    prisma.positionDivisionAccess.findMany.mockResolvedValue([]);

    await expect(getDivisionFigures('year-1')).resolves.toEqual([]);
    expect(prisma.allocationGroup.findMany).not.toHaveBeenCalled();
  });

  it('totals allocations and purchases per division', async () => {
    requireSession.mockResolvedValue(sessionWith('comptroller'));
    prisma.allocationGroup.findMany.mockResolvedValue(sampleGroups);

    const figures = await getDivisionFigures('year-1');

    expect(figures).toEqual([
      {
        allocationGroupId: 'group-events',
        name: 'Events',
        designationId: 'des-1',
        designationCode: 'SGA',
        designationName: 'Student Government',
        allocatedTotal: 150.3,
        spentTotal: 12.8,
        remaining: 137.5,
        notReimbursedCount: 2,
        noExpenseReportCount: 2,
      },
      {
        allocationGroupId: 'group-outreach',
        name: 'Outreach',
        designationId: 'des-1',
        designationCode: 'SGA',
        designationName: 'Student Government',
        allocatedTotal: 200,
        spentTotal: 0,
        remaining: 200,
        notReimbursedCount: 0,
        noExpenseReportCount: 0,
      },
      {
        allocationGroupId: 'group-empty',
        name: 'Unfunded',
        designationId: 'des-1',
        designationCode: 'SGA',
        designationName: 'Student Government',
        allocatedTotal: 0,
        spentTotal: 0,
        remaining: 0,
        notReimbursedCount: 0,
        noExpenseReportCount: 0,
      },
    ]);
  });
});
