import { describe, expect, it } from 'vitest';

import {
  canRequestWholeIndex,
  computeAllocationBudget,
  indexesOf,
  overBudgetBy,
  purchaseRequestInputSchema,
  resolveHeadStep,
} from '@/lib/purchase-request';

describe('computeAllocationBudget', () => {
  it('subtracts spent and committed from the allocation', () => {
    expect(
      computeAllocationBudget({ allocated: 1000, spent: 250.5, committed: 100 })
        .remaining,
    ).toBe(649.5);
  });

  it('avoids floating point drift', () => {
    expect(
      computeAllocationBudget({ allocated: 0.3, spent: 0.1, committed: 0.1 })
        .remaining,
    ).toBe(0.1);
  });
});

describe('overBudgetBy', () => {
  const budget = computeAllocationBudget({
    allocated: 500,
    spent: 300,
    committed: 100,
  });

  it('is zero when the request fits', () => {
    expect(overBudgetBy(budget, 100)).toBe(0);
  });

  it('is the overage when the request does not fit', () => {
    expect(overBudgetBy(budget, 150.25)).toBe(50.25);
  });
});

describe('purchaseRequestInputSchema', () => {
  const valid = {
    description: 'Banner printing',
    amount: '42.10',
    allocationId: 'a',
    designationId: 'd',
    purchaserId: 'p',
    processTemplateId: 't',
    notes: '',
    attachments: [],
  };

  it('coerces the amount', () => {
    expect(purchaseRequestInputSchema.parse(valid).amount).toBe(42.1);
  });

  it.each(['0', '-5', '1.234'])('rejects an amount of %s', (amount) => {
    expect(
      purchaseRequestInputSchema.safeParse({ ...valid, amount }).success,
    ).toBe(false);
  });

  it('allows a whole-index request with no allocation', () => {
    expect(
      purchaseRequestInputSchema.safeParse({ ...valid, allocationId: '' })
        .success,
    ).toBe(true);
  });

  it('requires an index', () => {
    expect(
      purchaseRequestInputSchema.safeParse({ ...valid, designationId: '' })
        .success,
    ).toBe(false);
  });

  it('requires a purchasing method', () => {
    expect(
      purchaseRequestInputSchema.safeParse({ ...valid, processTemplateId: '' })
        .success,
    ).toBe(false);
  });

  // Only reimbursements need one; the server checks against the method.
  it('allows no purchaser', () => {
    expect(
      purchaseRequestInputSchema.safeParse({ ...valid, purchaserId: '' })
        .success,
    ).toBe(true);
  });
});

describe('indexesOf', () => {
  it('lists each index once, in first-seen order', () => {
    expect(
      indexesOf([
        { designationId: 'b', designationLabel: 'Budget · DN1' },
        { designationId: 'c', designationLabel: 'Cash · DN2' },
        { designationId: 'b', designationLabel: 'Budget · DN1' },
      ]),
    ).toEqual([
      { id: 'b', label: 'Budget · DN1' },
      { id: 'c', label: 'Cash · DN2' },
    ]);
  });
});

describe('resolveHeadStep', () => {
  const head = 'vice-president-of-campus-affairs';

  it('waits on a held head position', () => {
    expect(
      resolveHeadStep({
        headPositionKey: head,
        actorIsHead: false,
        actorRole: 'requester',
        holders: 'held',
      }),
    ).toEqual({ status: 'HEAD_REVIEW' });
  });

  it('waits when SGAuth cannot say who holds it', () => {
    expect(
      resolveHeadStep({
        headPositionKey: head,
        actorIsHead: false,
        actorRole: 'purchaser',
        holders: 'unknown',
      }).status,
    ).toBe('HEAD_REVIEW');
  });

  it.each([
    ['requester', 'The requester is the divisional head.'],
    ['purchaser', 'Covered by their approval as E-Board purchaser.'],
  ] as const)('passes when the %s is the head', (actorRole, note) => {
    expect(
      resolveHeadStep({
        headPositionKey: head,
        actorIsHead: true,
        actorRole,
        holders: 'held',
      }),
    ).toEqual({ status: 'PENDING', event: { type: 'HEAD_APPROVED', note } });
  });

  it('skips a division with no head set', () => {
    expect(
      resolveHeadStep({
        headPositionKey: null,
        actorIsHead: false,
        actorRole: 'requester',
        holders: 'unknown',
      }),
    ).toEqual({
      status: 'PENDING',
      event: {
        type: 'HEAD_SKIPPED',
        note: 'No divisional head is set for this division.',
      },
    });
  });

  it('skips a vacant head position', () => {
    const step = resolveHeadStep({
      headPositionKey: head,
      actorIsHead: false,
      actorRole: 'purchaser',
      holders: 'vacant',
    });
    expect(step.status).toBe('PENDING');
    expect(step.status === 'PENDING' && step.event?.type).toBe('HEAD_SKIPPED');
  });
});

describe('canRequestWholeIndex', () => {
  const base = {
    isEditor: false,
    canRequestBudgetIndex: false,
    positionKeys: ['director-of-sustainability'],
    listedPositionKeys: [] as string[],
  };

  it('allows nobody, not even editors, on an allocations-only index', () => {
    expect(canRequestWholeIndex({ ...base, access: 'ALLOCATIONS_ONLY' })).toBe(
      false,
    );
    expect(
      canRequestWholeIndex({
        ...base,
        access: 'ALLOCATIONS_ONLY',
        isEditor: true,
        canRequestBudgetIndex: true,
      }),
    ).toBe(false);
  });

  it('opens a budget-requester index to budget index requesters', () => {
    expect(canRequestWholeIndex({ ...base, access: 'BUDGET_REQUESTERS' })).toBe(
      false,
    );
    expect(
      canRequestWholeIndex({
        ...base,
        access: 'BUDGET_REQUESTERS',
        canRequestBudgetIndex: true,
      }),
    ).toBe(true);
  });

  it('opens a listed-positions index to holders of a listed position', () => {
    expect(
      canRequestWholeIndex({
        ...base,
        access: 'LISTED_POSITIONS',
        canRequestBudgetIndex: true,
      }),
    ).toBe(false);
    expect(
      canRequestWholeIndex({
        ...base,
        access: 'LISTED_POSITIONS',
        listedPositionKeys: ['director-of-sustainability'],
      }),
    ).toBe(true);
  });

  it('lets editors request against any open index', () => {
    for (const access of ['BUDGET_REQUESTERS', 'LISTED_POSITIONS'] as const)
      expect(canRequestWholeIndex({ ...base, access, isEditor: true })).toBe(
        true,
      );
  });
});
