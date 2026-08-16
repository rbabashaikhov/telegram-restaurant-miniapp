export function roundMoney(value: number): number {
  return Math.round(value);
}

export function lineTotal(unitPrice: number, quantity: number, modifierSum: number): number {
  return roundMoney((unitPrice + modifierSum) * quantity);
}

export function cartTotal(lines: Array<{ lineTotal: number }>): number {
  return lines.reduce((sum, line) => sum + line.lineTotal, 0);
}

export function loyaltyEarnAmount(orderTotal: number, percent: number): number {
  return Math.floor((orderTotal * percent) / 100);
}

export function formatMoney(amount: number, symbol = '₽'): string {
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}
