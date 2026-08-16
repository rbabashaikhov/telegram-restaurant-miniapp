import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createOrder, updateOrderStatus } from './orders.js';
import { adjustLoyalty, earnForOrder, loyaltySnapshot } from './loyalty.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

describe('loyalty', () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => {
    world.db.close();
  });

  it('earns a percent of a completed order', () => {
    const order = createOrder(world.providers, {
      guestTelegram: { id: 501, first_name: 'New' },
      locationId: 1,
      type: 'takeaway',
      items: [{ menuItemId: 14, quantity: 1, modifierIds: [] }],
    });
    const completed = updateOrderStatus(world.providers, order.id, 'completed');
    const snapshot = loyaltySnapshot(world.providers, completed.guestId);
    expect(snapshot.balance).toBe(Math.floor(790 * 0.05));
  });

  it('does not earn twice for the same order', () => {
    const order = createOrder(world.providers, {
      guestTelegram: { id: 502, first_name: 'Once' },
      locationId: 1,
      type: 'takeaway',
      items: [{ menuItemId: 14, quantity: 1, modifierIds: [] }],
    });
    const completed = updateOrderStatus(world.providers, order.id, 'completed');
    earnForOrder(world.providers, { ...completed, status: 'completed' }, `earn:order:${completed.id}`);
    earnForOrder(world.providers, { ...completed, status: 'completed' }, `earn:order:${completed.id}`);
    const snapshot = loyaltySnapshot(world.providers, completed.guestId);
    expect(snapshot.transactions.filter((tx) => tx.type === 'earned' && tx.orderId === completed.id)).toHaveLength(1);
  });

  it('adjusts balance through the ledger', () => {
    const { guest } = world.providers.guests.upsert({ id: 503, first_name: 'Adjust' });
    const result = adjustLoyalty(world.providers, guest.id, 100, 'Компенсация');
    expect(result.transaction.type).toBe('adjustment');
    expect(result.balance).toBe(100);
    const snapshot = loyaltySnapshot(world.providers, guest.id);
    expect(snapshot.transactions[0]?.note).toBe('Компенсация');
  });

  it('keeps transaction history for the demo guest', () => {
    const snapshot = loyaltySnapshot(world.providers, 1);
    expect(snapshot.balance).toBe(620);
    expect(snapshot.transactions.length).toBeGreaterThan(1);
  });
});
