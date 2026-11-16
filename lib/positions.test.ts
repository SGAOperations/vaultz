import { describe, expect, it } from 'vitest';

import { positionsChanged } from '@/lib/positions';

describe('positionsChanged', () => {
  it('is false for the same keys in any order', () => {
    expect(positionsChanged(['a', 'b'], ['b', 'a'])).toBe(false);
  });

  it('ignores duplicates', () => {
    expect(positionsChanged(['a'], ['a', 'a'])).toBe(false);
  });

  it('is true when a key is gained or lost', () => {
    expect(positionsChanged(['a'], ['a', 'b'])).toBe(true);
    expect(positionsChanged(['a', 'b'], ['a'])).toBe(true);
    expect(positionsChanged([], ['comptroller'])).toBe(true);
  });
});
