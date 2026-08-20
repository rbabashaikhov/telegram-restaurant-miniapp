import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../types';
import { addLine, cartTotal, changeQty, lineKey, toPayload } from './cart';

const item = {
  id: 14,
  categoryId: 5,
  name: 'Карбонара',
  description: '',
  price: 790,
  image: '',
  isAvailable: true,
  prepTimeMinutes: 14,
  tags: [],
  allergens: [],
  modifierGroups: [
    {
      id: 4,
      name: 'Добавки',
      required: false,
      minSelect: 0,
      maxSelect: 2,
      modifiers: [{ id: 10, name: 'Пармезан extra', priceDelta: 80 }],
    },
  ],
} as MenuItem;

describe('cart', () => {
  it('merges the same dish and modifiers', () => {
    const once = addLine([], item, [10]);
    const twice = addLine(once, item, [10]);
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(2);
    expect(cartTotal(twice)).toBe(1740);
  });

  it('keeps different modifiers as separate lines', () => {
    const mixed = addLine(addLine([], item, [10]), item, []);
    expect(mixed).toHaveLength(2);
    expect(lineKey(14, [10])).not.toBe(lineKey(14, []));
  });

  it('removes a line when quantity hits zero', () => {
    const added = addLine([], item, []);
    const lines = changeQty(added, added[0].key, -1);
    expect(lines).toHaveLength(0);
  });

  it('keeps a dish comment on the line without treating it as a modifier', () => {
    const lines = addLine([], item, [10], 'без лука, соус отдельно');
    expect(lines[0].comment).toBe('без лука, соус отдельно');
    expect(lines[0].unitPrice).toBe(870);
    expect(toPayload(lines)[0].comment).toBe('без лука, соус отдельно');
    expect(lineKey(14, [10], 'без лука, соус отдельно')).not.toBe(lineKey(14, [10]));
  });
});
