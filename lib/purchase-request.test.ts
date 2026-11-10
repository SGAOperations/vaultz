import { describe, expect, it } from 'vitest';

import {
  computeAllocationBudget,
  overBudgetBy,
  purchaseRequestInputSchema,
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
    categoryId: 'c',
    purchaserId: 'p',
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

  it('requires a purchaser', () => {
    expect(
      purchaseRequestInputSchema.safeParse({ ...valid, purchaserId: '' })
        .success,
    ).toBe(false);
  });
});
