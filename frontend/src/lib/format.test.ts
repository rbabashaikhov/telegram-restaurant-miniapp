import { describe, expect, it } from 'vitest';
import { formatMoney, nextFriday, toIsoDate } from './format';

describe('format', () => {
  it('formats ruble amounts', () => {
    expect(formatMoney(1240)).toContain('1');
    expect(formatMoney(1240)).toContain('₽');
  });

  it('returns a Friday after the given date', () => {
    const friday = nextFriday(new Date('2026-08-16T10:00:00'));
    expect(new Date(friday + 'T00:00:00').getDay()).toBe(5);
    expect(friday > toIsoDate(new Date('2026-08-16'))).toBe(true);
  });
});
