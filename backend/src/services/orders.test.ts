import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createOrder, repeatOrder, updateOrderStatus } from './orders.js';
import { createReservation } from './reservations.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

describe('orders', () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => {
    world.db.close();
  });

  it('creates a takeaway order and calculates totals', () => {
    const order = createOrder(world.providers, {
      guestTelegram: world.user,
      locationId: 1,
      type: 'takeaway',
      items: [
        { menuItemId: 14, quantity: 2, modifierIds: [10] },
        { menuItemId: 22, quantity: 1, modifierIds: [8] },
      ],
    });
    expect(order.total).toBe(790 * 2 + 80 * 2 + 280 + 40);
    expect(order.status).toBe('submitted');
    expect(order.pickupAt).toBeTruthy();
  });

  it('requires steak doneness', () => {
    expect(() =>
      createOrder(world.providers, {
        guestTelegram: world.user,
        locationId: 1,
        type: 'dine_in',
        items: [{ menuItemId: 10, quantity: 1, modifierIds: [] }],
      }),
    ).toThrow(/required/i);
  });

  it('links a preorder to a reservation', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: world.user,
      locationId: 1,
      date: '2030-05-16',
      startTime: '19:00',
      partySize: 2,
      diningAreaId: 2,
      occasion: 'date',
    });
    const order = createOrder(world.providers, {
      guestTelegram: world.user,
      locationId: 1,
      type: 'reservation_preorder',
      reservationId: reservation.id,
      items: [
        { menuItemId: 1, quantity: 2, modifierIds: [] },
        { menuItemId: 5, quantity: 2, modifierIds: [] },
      ],
    });
    expect(order.reservationId).toBe(reservation.id);
    expect(world.providers.reservations.getById(reservation.id)?.preorder?.id).toBe(order.id);
  });

  it('repeats available items and skips unavailable ones', () => {
    const order = createOrder(world.providers, {
      guestTelegram: world.user,
      locationId: 1,
      type: 'takeaway',
      items: [
        { menuItemId: 14, quantity: 1, modifierIds: [] },
        { menuItemId: 17, quantity: 1, modifierIds: [] },
      ],
    });
    world.providers.menu.setItemAvailability(17, false);
    const repeated = repeatOrder(world.providers, order.id, 1);
    expect(repeated.items.some((item) => item.menuItemId === 14)).toBe(true);
    expect(repeated.skipped.some((item) => item.menuItemId === 17)).toBe(true);
  });

  it('is idempotent on create', () => {
    const payload = {
      guestTelegram: world.user,
      locationId: 1,
      type: 'takeaway' as const,
      items: [{ menuItemId: 21, quantity: 1, modifierIds: [] }],
      idempotencyKey: 'order-1',
    };
    const a = createOrder(world.providers, payload);
    const b = createOrder(world.providers, payload);
    expect(a.id).toBe(b.id);
  });

  it('completes an order', () => {
    const order = createOrder(world.providers, {
      guestTelegram: world.user,
      locationId: 1,
      type: 'takeaway',
      items: [{ menuItemId: 21, quantity: 1, modifierIds: [] }],
    });
    const ready = updateOrderStatus(world.providers, order.id, 'ready');
    expect(ready.status).toBe('ready');
    const completed = updateOrderStatus(world.providers, order.id, 'completed');
    expect(completed.status).toBe('completed');
  });
});
