import { describe, expect, it } from 'vitest';

import { defaultPeriodId } from '@/lib/periods';

// Date-only columns arrive from Prisma as UTC midnight.
const period = (id: string, start: string, end: string) => ({
  id,
  startDate: new Date(`${start}T00:00:00.000Z`),
  endDate: new Date(`${end}T00:00:00.000Z`),
});

const periods = [
  period('fall', '2026-07-01', '2026-12-31'),
  period('spring', '2027-01-01', '2027-04-30'),
  period('summer', '2027-05-01', '2027-06-30'),
];

describe('defaultPeriodId', () => {
  it('picks the period covering today', () => {
    expect(defaultPeriodId(periods, new Date(2027, 1, 15))).toBe('spring');
  });

  it('includes the first and last day of a period', () => {
    expect(defaultPeriodId(periods, new Date(2026, 11, 31))).toBe('fall');
    expect(defaultPeriodId(periods, new Date(2027, 0, 1))).toBe('spring');
  });

  it('picks the latest started period for a past year', () => {
    expect(defaultPeriodId(periods, new Date(2028, 0, 1))).toBe('summer');
  });

  it('picks the first period for a future year', () => {
    expect(defaultPeriodId(periods, new Date(2026, 0, 1))).toBe('fall');
  });

  it('returns nothing when there are no periods', () => {
    expect(defaultPeriodId([], new Date())).toBeUndefined();
  });
});
