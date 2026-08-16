import { Router } from 'express';
import { z } from 'zod';
import { publicAppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { writeRateLimit } from '../middleware/rateLimit.js';
import { assembleDinnerForTwo, filterMenuByIntent } from '../domain/menu.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
import { MENU_INTENTS, ORDER_TYPES, VISIT_OCCASIONS } from '../types.js';
import { createOrder, estimatePickupMinutes, repeatOrder } from '../services/orders.js';
import {
  cancelReservation,
  createReservation,
  listAvailability,
  rescheduleReservation,
} from '../services/reservations.js';
import { acceptWaitlist, cancelWaitlist, joinWaitlist } from '../services/waitlist.js';
import { guestProfile } from '../services/guests.js';
import { loyaltySnapshot } from '../services/loyalty.js';
import { callWaiter, requestBill, tableContext } from '../services/tables.js';
import { asyncHandler, mountErrorHandler, ok, parseId, readIdempotencyKey } from './helpers.js';
import {
  serializeGuestProfile,
  serializeMenu,
  serializeMenuItem,
  serializeOrder,
  serializeReservationPublic,
  serializeRestaurant,
  serializeWaitlist,
} from './serialize.js';

const cartLineSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  modifierIds: z.array(z.number().int().positive()).default([]),
  comment: z.string().max(280).optional().nullable(),
});

export function createPublicRouter(data: Providers = defaultProviders): Router {
  const router = Router();

  router.get(
    '/restaurant',
    asyncHandler((_req, res) => {
      const restaurant = data.restaurant.getRestaurant();
      const location = data.restaurant.getLocation();
      ok(res, serializeRestaurant(restaurant, location, data.restaurant.listDiningAreas(location.id)));
    }),
  );

  router.get(
    '/menu',
    asyncHandler((req, res) => {
      const location = data.restaurant.getLocation();
      const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;
      const categories = data.menu.listCategories(location.id);
      let items = data.menu.listItems(location.id);
      if (intent && MENU_INTENTS.includes(intent as never)) {
        items = filterMenuByIntent(items, intent as never);
      }
      ok(res, serializeMenu(categories, items));
    }),
  );

  router.get(
    '/menu/items/:id',
    asyncHandler((req, res) => {
      const item = data.menu.getItem(parseId(req.params.id));
      if (!item) throw new AppError('Menu item not found', 404, 'MENU_ITEM_NOT_FOUND');
      ok(res, serializeMenuItem(item));
    }),
  );

  router.get(
    '/menu/dinner-for-two',
    asyncHandler((req, res) => {
      const budget = Number(req.query.budget || 5000);
      const location = data.restaurant.getLocation();
      const assembled = assembleDinnerForTwo(data.menu.listItems(location.id, { availableOnly: true }), budget);
      if (!assembled) throw new AppError('Could not assemble dinner within budget', 404, 'DINNER_NOT_FOUND');
      ok(res, {
        total: assembled.total,
        items: assembled.items.map(serializeMenuItem),
      });
    }),
  );

  router.get(
    '/availability',
    asyncHandler((req, res) => {
      const date = String(req.query.date || '');
      const partySize = Number(req.query.partySize || req.query.party_size || 2);
      const diningAreaId = req.query.diningAreaId ? Number(req.query.diningAreaId) : undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError('Date is required (YYYY-MM-DD)', 400, 'VALIDATION_ERROR');
      }
      if (!Number.isInteger(partySize) || partySize < 1) {
        throw new AppError('Party size is invalid', 400, 'VALIDATION_ERROR');
      }
      const location = data.restaurant.getLocation();
      ok(
        res,
        listAvailability(data, {
          locationId: location.id,
          date,
          partySize,
          diningAreaId: Number.isFinite(diningAreaId) ? diningAreaId : undefined,
        }),
      );
    }),
  );

  router.get(
    '/table/context',
    asyncHandler((req, res) => {
      const code = String(req.query.table || req.query.code || '').toUpperCase();
      const location = data.restaurant.getLocation();
      ok(res, tableContext(data, location.id, code));
    }),
  );

  router.post(
    '/reservations',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const body = z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          partySize: z.number().int().min(1).max(16),
          diningAreaId: z.number().int().positive().optional().nullable(),
          occasion: z.enum(VISIT_OCCASIONS).default('casual'),
          wishes: z
            .object({
              highChair: z.boolean().optional(),
              birthday: z.boolean().optional(),
              quietTable: z.boolean().optional(),
              stroller: z.boolean().optional(),
              comment: z.string().max(500).optional(),
            })
            .optional(),
          preorder: z.array(cartLineSchema).optional(),
          name: z.string().max(120).optional(),
          phone: z.string().max(32).optional(),
        })
        .parse(req.body);

      const location = data.restaurant.getLocation();
      const reservation = createReservation(data, {
        guestTelegram: auth.telegramUser,
        locationId: location.id,
        date: body.date,
        startTime: body.startTime,
        partySize: body.partySize,
        diningAreaId: body.diningAreaId,
        occasion: body.occasion,
        wishes: body.wishes,
        name: body.name,
        phone: body.phone,
        idempotencyKey: readIdempotencyKey(req),
      });

      if (body.preorder?.length) {
        createOrder(data, {
          guestTelegram: auth.telegramUser,
          locationId: location.id,
          type: 'reservation_preorder',
          items: body.preorder,
          reservationId: reservation.id,
          comment: body.wishes?.comment,
          idempotencyKey: readIdempotencyKey(req)
            ? `${readIdempotencyKey(req)}:preorder`
            : undefined,
        });
      }

      ok(res, serializeReservationPublic(data.reservations.getById(reservation.id)!), 201);
    }),
  );

  router.get(
    '/reservations/me',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      ok(res, data.reservations.listByGuest(guest.id).map(serializeReservationPublic));
    }),
  );

  router.get(
    '/reservations/:id',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const reservation = data.reservations.getById(parseId(req.params.id));
      if (!reservation || reservation.guestId !== guest.id) {
        throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
      }
      ok(res, serializeReservationPublic(reservation));
    }),
  );

  router.post(
    '/reservations/:id/cancel',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      ok(res, serializeReservationPublic(cancelReservation(data, parseId(req.params.id), guest.id)));
    }),
  );

  router.post(
    '/reservations/:id/reschedule',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const body = z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          partySize: z.number().int().min(1).max(16).optional(),
          diningAreaId: z.number().int().positive().optional().nullable(),
        })
        .parse(req.body);
      ok(
        res,
        serializeReservationPublic(
          rescheduleReservation(data, {
            reservationId: parseId(req.params.id),
            guestId: guest.id,
            ...body,
          }),
        ),
      );
    }),
  );

  router.post(
    '/orders',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const body = z
        .object({
          type: z.enum(ORDER_TYPES),
          items: z.array(cartLineSchema).min(1),
          reservationId: z.number().int().positive().optional().nullable(),
          tableCode: z.string().max(16).optional(),
          comment: z.string().max(500).optional().nullable(),
          pickupAt: z.string().optional().nullable(),
        })
        .parse(req.body);
      const location = data.restaurant.getLocation();
      const table = body.tableCode
        ? data.tables.getTableByCode(location.id, body.tableCode.toUpperCase())
        : undefined;
      const order = createOrder(data, {
        guestTelegram: auth.telegramUser,
        locationId: location.id,
        type: body.type,
        items: body.items,
        reservationId: body.reservationId,
        tableId: table?.id ?? null,
        comment: body.comment,
        pickupAt: body.pickupAt,
        idempotencyKey: readIdempotencyKey(req),
      });
      ok(res, serializeOrder(order), 201);
    }),
  );

  router.get(
    '/orders/me',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      ok(res, data.orders.listByGuest(guest.id).map(serializeOrder));
    }),
  );

  router.post(
    '/orders/:id/repeat',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      ok(res, repeatOrder(data, parseId(req.params.id), guest.id));
    }),
  );

  router.get(
    '/orders/pickup-estimate',
    asyncHandler((req, res) => {
      const minutes = Number(req.query.minutes || 15);
      ok(res, { minutes, label: `Забрать примерно через ${minutes} минут` });
    }),
  );

  router.post(
    '/orders/estimate',
    authMiddleware,
    asyncHandler((req, res) => {
      const body = z.object({ items: z.array(cartLineSchema).min(1) }).parse(req.body);
      const items = body.items.map((line) => {
        const menuItem = data.menu.getItem(line.menuItemId);
        return { prepTimeMinutes: menuItem?.prepTimeMinutes ?? 15, quantity: line.quantity };
      });
      const minutes = estimatePickupMinutes(items);
      ok(res, { minutes, label: `Забрать примерно через ${minutes} минут` });
    }),
  );

  router.get(
    '/guest/me',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const profile = guestProfile(data, guest.id);
      ok(res, profile ? serializeGuestProfile(profile) : null);
    }),
  );

  router.post(
    '/guest/me/preferences',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const body = z
        .object({
          preferredDiningAreaId: z.number().int().positive().nullable().optional(),
          dietaryPreferences: z.array(z.string()).optional(),
          notes: z.string().max(500).nullable().optional(),
        })
        .parse(req.body);
      const preferences = data.guests.updatePreferences(guest.id, {
        guestId: guest.id,
        preferredDiningAreaId: body.preferredDiningAreaId ?? null,
        dietaryPreferences: (body.dietaryPreferences ?? []) as never,
        notes: body.notes ?? null,
        staffNotes: data.guests.getPreferences(guest.id).staffNotes,
      });
      ok(res, {
        preferredDiningAreaId: preferences.preferredDiningAreaId,
        dietaryPreferences: preferences.dietaryPreferences,
        notes: preferences.notes,
      });
    }),
  );

  router.get(
    '/loyalty/me',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const snapshot = loyaltySnapshot(data, guest.id);
      ok(res, {
        balance: snapshot.balance,
        transactions: snapshot.transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          note: tx.note,
          createdAt: tx.createdAt,
        })),
      });
    }),
  );

  router.post(
    '/waitlist',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const body = z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
          partySize: z.number().int().min(1).max(16),
          diningAreaId: z.number().int().positive().optional().nullable(),
        })
        .parse(req.body);
      const location = data.restaurant.getLocation();
      ok(
        res,
        serializeWaitlist(
          joinWaitlist(data, {
            guestTelegram: auth.telegramUser,
            locationId: location.id,
            ...body,
          }),
        ),
        201,
      );
    }),
  );

  router.post(
    '/waitlist/:id/accept',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      ok(res, serializeWaitlist(acceptWaitlist(data, parseId(req.params.id), guest.id)));
    }),
  );

  router.post(
    '/waitlist/:id/cancel',
    authMiddleware,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      ok(res, serializeWaitlist(cancelWaitlist(data, parseId(req.params.id), guest.id)));
    }),
  );

  router.post(
    '/table/call-waiter',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const body = z.object({ tableCode: z.string(), note: z.string().max(280).optional() }).parse(req.body);
      const location = data.restaurant.getLocation();
      ok(res, callWaiter(data, { locationId: location.id, tableCode: body.tableCode.toUpperCase(), guestId: guest.id, note: body.note }));
    }),
  );

  router.post(
    '/table/request-bill',
    authMiddleware,
    writeRateLimit,
    asyncHandler((req, res) => {
      const auth = requireAuth(req);
      const { guest } = data.guests.upsert(auth.telegramUser);
      const body = z.object({ tableCode: z.string() }).parse(req.body);
      const location = data.restaurant.getLocation();
      ok(res, requestBill(data, { locationId: location.id, tableCode: body.tableCode.toUpperCase(), guestId: guest.id }));
    }),
  );

  void publicAppConfig;
  mountErrorHandler(router);
  return router;
}

export const publicRouter = createPublicRouter();
