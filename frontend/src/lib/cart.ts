import type { MenuItem } from '../types';

export interface CartLine {
  key: string;
  menuItemId: number;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  modifierIds: number[];
  modifierLabels: string[];
  comment?: string;
}

export function lineKey(menuItemId: number, modifierIds: number[], comment?: string): string {
  return `${menuItemId}:${[...modifierIds].sort((a, b) => a - b).join(',')}:${comment || ''}`;
}

export function unitPriceFor(item: MenuItem, modifierIds: number[]): number {
  const extra = item.modifierGroups
    .flatMap((group) => group.modifiers)
    .filter((modifier) => modifierIds.includes(modifier.id))
    .reduce((sum, modifier) => sum + modifier.priceDelta, 0);
  return item.price + extra;
}

export function modifierLabels(item: MenuItem, modifierIds: number[]): string[] {
  return item.modifierGroups
    .flatMap((group) => group.modifiers)
    .filter((modifier) => modifierIds.includes(modifier.id))
    .map((modifier) => modifier.name);
}

export function addLine(lines: CartLine[], item: MenuItem, modifierIds: number[], comment?: string): CartLine[] {
  const key = lineKey(item.id, modifierIds, comment);
  const existing = lines.find((line) => line.key === key);
  if (existing) {
    return lines.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line));
  }
  return [
    ...lines,
    {
      key,
      menuItemId: item.id,
      name: item.name,
      image: item.image,
      quantity: 1,
      unitPrice: unitPriceFor(item, modifierIds),
      modifierIds,
      modifierLabels: modifierLabels(item, modifierIds),
      comment,
    },
  ];
}

export function changeQty(lines: CartLine[], key: string, delta: number): CartLine[] {
  return lines
    .map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line))
    .filter((line) => line.quantity > 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function toPayload(lines: CartLine[]) {
  return lines.map((line) => ({
    menuItemId: line.menuItemId,
    quantity: line.quantity,
    modifierIds: line.modifierIds,
    comment: line.comment ?? null,
  }));
}
