import { describe, expect, it } from 'vitest';
import { cartTotal, lineTotal, loyaltyEarnAmount } from './money.js';

describe('money', () => {
  it('adds modifier deltas into the line total', () => {
    expect(lineTotal(790, 2, 80)).toBe(1740);
  });

  it('sums the cart', () => {
    expect(cartTotal([{ lineTotal: 790 }, { lineTotal: 490 }])).toBe(1280);
  });

  it('earns a whole-ruble percent of the order', () => {
    expect(loyaltyEarnAmount(12400, 5)).toBe(620);
    expect(loyaltyEarnAmount(199, 5)).toBe(9);
  });
});
