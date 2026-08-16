import { config } from '../config.js';
import { loyaltyEarnAmount } from '../domain/money.js';
import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type { LoyaltyTransaction, Order } from '../types.js';

export function earnForOrder(data: Providers, order: Order, idempotencyKey: string): LoyaltyTransaction | null {
  if (order.status !== 'completed') return null;
  const existing = data.loyalty.findByIdempotencyKey(idempotencyKey) ?? data.loyalty.findEarnForOrder(order.id);
  if (existing) return existing;
  const amount = loyaltyEarnAmount(order.total, config.restaurant.loyaltyEarnPercent);
  if (amount <= 0) return null;
  const account = data.loyalty.getOrCreateAccount(order.guestId);
  const tx = data.loyalty.addTransaction({
    accountId: account.id,
    type: 'earned',
    amount,
    orderId: order.id,
    note: `${config.restaurant.loyaltyEarnPercent}% от заказа ${order.number}`,
    idempotencyKey,
  });
  data.events.publish('loyalty.earned', {
    guestId: order.guestId,
    orderId: order.id,
    amount,
  });
  return tx;
}

export function adjustLoyalty(
  data: Providers,
  guestId: number,
  amount: number,
  note: string,
): { balance: number; transaction: LoyaltyTransaction } {
  if (amount === 0) throw new AppError('Adjustment cannot be zero', 400, 'VALIDATION_ERROR');
  const account = data.loyalty.getOrCreateAccount(guestId);
  const transaction = data.loyalty.addTransaction({
    accountId: account.id,
    type: 'adjustment',
    amount,
    orderId: null,
    note,
    idempotencyKey: `adjust:${guestId}:${Date.now()}:${amount}`,
  });
  data.events.publish('loyalty.adjusted', { guestId, amount, note });
  return { balance: data.loyalty.balance(account.id), transaction };
}

export function loyaltySnapshot(data: Providers, guestId: number) {
  const account = data.loyalty.getOrCreateAccount(guestId);
  return {
    account,
    balance: data.loyalty.balance(account.id),
    transactions: data.loyalty.listTransactions(account.id),
  };
}
