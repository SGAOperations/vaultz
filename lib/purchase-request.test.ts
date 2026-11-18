import { describe, expect, it } from 'vitest';

import {
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
