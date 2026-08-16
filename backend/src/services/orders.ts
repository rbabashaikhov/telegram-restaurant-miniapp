import { config } from '../config.js';
import { lineTotal } from '../domain/money.js';
import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type {
  CartLineInput,
  MenuItem,
  Order,
  OrderStatus,
  OrderType,
  RepeatOrderResult,
} from '../types.js';
import { earnForOrder } from './loyalty.js';

function resolveModifiers(item: MenuItem, modifierIds: number[]) {
  const selected = [];
  for (const group of item.modifierGroups) {
    const chosen = group.modifiers.filter((modifier) => modifierIds.includes(modifier.id) && modifier.isActive);
    if (group.required && chosen.length < group.minSelect) {
      throw new AppError(`Modifier group "${group.name}" is required`, 400, 'MODIFIER_REQUIRED', {
        groupId: group.id,
      });
    }
    if (chosen.length < group.minSelect || chosen.length > group.maxSelect) {
      throw new AppError(`Invalid modifier selection for "${group.name}"`, 400, 'MODIFIER_INVALID', {
        groupId: group.id,
      });
    }
    selected.push(...chosen);
  }
  const unknown = modifierIds.filter(
    (id) => !item.modifierGroups.some((group) => group.modifiers.some((modifier) => modifier.id === id)),
  );
  if (unknown.length) {
    throw new AppError('Unknown modifier', 400, 'MODIFIER_INVALID');
  }
  return selected;
}

export function buildOrderItems(data: Providers, lines: CartLineInput[]) {
  if (!lines.length) {
    throw new AppError('Cart is empty', 400, 'CART_EMPTY');
  }
  const items = lines.map((line) => {
    if (line.quantity < 1) throw new AppError('Quantity must be at least 1', 400, 'VALIDATION_ERROR');
    const menuItem = data.menu.getItem(line.menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      throw new AppError('Menu item is not available', 409, 'MENU_ITEM_UNAVAILABLE', {
        menuItemId: line.menuItemId,
      });
    }
    const modifiers = resolveModifiers(menuItem, line.modifierIds);
    const modifierSum = modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0);
    const unitPrice = menuItem.price + modifierSum;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: line.quantity,
      unitPrice,
      lineTotal: lineTotal(menuItem.price, line.quantity, modifierSum),
      comment: line.comment ?? null,
      modifiers: modifiers.map((modifier) => ({
        modifierId: modifier.id,
        name: modifier.name,
        priceDelta: modifier.priceDelta,
      })),
      prepTimeMinutes: menuItem.prepTimeMinutes,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal, total: subtotal };
}

export function estimatePickupMinutes(lines: Array<{ prepTimeMinutes: number; quantity: number }>): number {
  const longest = Math.max(...lines.map((line) => line.prepTimeMinutes), 10);
  const extra = lines.reduce((sum, line) => sum + Math.max(0, line.quantity - 1) * 2, 0);
  return Math.min(45, Math.max(10, longest + extra));
}

export function createOrder(
  data: Providers,
  params: {
    guestTelegram: { id: number; first_name?: string; last_name?: string; username?: string };
    locationId: number;
    type: OrderType;
    items: CartLineInput[];
    reservationId?: number | null;
    tableId?: number | null;
    comment?: string | null;
    pickupAt?: string | null;
    idempotencyKey?: string;
    name?: string;
    phone?: string;
  },
): Order {
  if (params.idempotencyKey) {
    const existing = data.idempotency.get(params.idempotencyKey, 'order.create');
    if (existing) {
      const order = data.orders.getById(existing.resourceId);
      if (order) return order;
    }
  }

  return data.transaction(() => {
    const { guest, created } = data.guests.upsert(params.guestTelegram, {
      name: params.name,
      phone: params.phone,
    });
    if (created) data.events.publish('guest.created', { guestId: guest.id });

    if (params.reservationId) {
      const reservation = data.reservations.getById(params.reservationId);
      if (!reservation || reservation.guestId !== guest.id) {
        throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
      }
    }

    const built = buildOrderItems(data, params.items);
    const pickupAt =
      params.type === 'takeaway'
        ? params.pickupAt ||
          new Date(Date.now() + estimatePickupMinutes(built.items) * 60_000).toISOString()
        : params.pickupAt ?? null;

    const order = data.orders.create({
      guestId: guest.id,
      locationId: params.locationId,
      reservationId: params.reservationId ?? null,
      tableId: params.tableId ?? null,
      type: params.type,
      status: 'submitted',
      pickupAt,
      comment: params.comment ?? null,
      items: built.items,
      subtotal: built.subtotal,
      total: built.total,
    });

    if (params.idempotencyKey) {
      data.idempotency.put({
        key: params.idempotencyKey,
        scope: 'order.create',
        resourceType: 'order',
        resourceId: order.id,
      });
    }

    data.events.publish('order.created', {
      orderId: order.id,
      type: order.type,
      total: order.total,
      reservationId: order.reservationId,
    });

    try {
      data.pos.submitOrder(order);
    } catch (error) {
      if (error instanceof AppError && error.code === 'POS_NOT_CONFIGURED') {
        throw error;
      }
      throw error;
    }

    return order;
  });
}

export function repeatOrder(data: Providers, orderId: number, guestId?: number): RepeatOrderResult {
  const order = data.orders.getById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (guestId && order.guestId !== guestId) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  }
  const items: CartLineInput[] = [];
  const skipped: RepeatOrderResult['skipped'] = [];
  for (const line of order.items) {
    const menuItem = data.menu.getItem(line.menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      skipped.push({
        menuItemId: line.menuItemId,
        name: line.name,
        reason: 'Блюдо сейчас недоступно',
      });
      continue;
    }
    const modifierIds = line.modifiers
      .map((modifier) => modifier.modifierId)
      .filter((id) =>
        menuItem.modifierGroups.some((group) => group.modifiers.some((item) => item.id === id && item.isActive)),
      );
    items.push({
      menuItemId: menuItem.id,
      quantity: line.quantity,
      modifierIds,
      comment: line.comment,
    });
  }
  return { items, skipped };
}

export function updateOrderStatus(data: Providers, orderId: number, status: OrderStatus): Order {
  const order = data.orders.getById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  const updated = data.orders.updateStatus(orderId, status);
  if (status === 'confirmed') data.events.publish('order.confirmed', { orderId });
  if (status === 'ready') data.events.publish('order.ready', { orderId });
  if (status === 'cancelled') data.events.publish('order.cancelled', { orderId });
  if (status === 'completed') {
    data.events.publish('order.completed', { orderId });
    earnForOrder(data, updated, `earn:order:${updated.id}`);
  }
  return data.orders.getById(orderId)!;
}
