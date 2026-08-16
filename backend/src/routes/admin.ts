import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../errors.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
import { ORDER_STATUSES, RESERVATION_STATUSES } from '../types.js';
import { dashboardKpis } from '../services/analytics.js';
import { guestProfile, guestTimeline } from '../services/guests.js';
import { adjustLoyalty, loyaltySnapshot } from '../services/loyalty.js';
import { updateOrderStatus } from '../services/orders.js';
import { cancelReservation, changeReservationStatus, rescheduleReservation } from '../services/reservations.js';
import { offerWaitlist } from '../services/waitlist.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';
import {
  serializeGuestProfile,
  serializeMenuItem,
  serializeOrder,
  serializeReservationAdmin,
  serializeTable,
  serializeWaitlist,
} from './serialize.js';

function todayReservations(data: Providers, date?: string) {
  const day =
    date ||
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })();
  return data.reservations.list({ date: day });
}

export function createAdminRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(adminAuthMiddleware);

  router.get(
    '/dashboard',
    asyncHandler((_req, res) => {
      ok(res, dashboardKpis(data));
    }),
  );

  router.get(
    '/reservations',
    asyncHandler((req, res) => {
      ok(
        res,
        data.reservations
          .list({
            date: typeof req.query.date === 'string' ? req.query.date : undefined,
            status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
          })
          .map(serializeReservationAdmin),
      );
    }),
  );

  router.get(
    '/reservations/:id',
    asyncHandler((req, res) => {
      const reservation = data.reservations.getById(parseId(req.params.id));
      if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
      ok(res, serializeReservationAdmin(reservation));
    }),
  );

  router.post(
    '/reservations/:id/status',
    asyncHandler((req, res) => {
      const body = z.object({ status: z.enum(RESERVATION_STATUSES) }).parse(req.body);
      if (body.status === 'cancelled') {
        ok(res, serializeReservationAdmin(cancelReservation(data, parseId(req.params.id))));
        return;
      }
      ok(res, serializeReservationAdmin(changeReservationStatus(data, parseId(req.params.id), body.status)));
    }),
  );

  router.post(
    '/reservations/:id/reschedule',
    asyncHandler((req, res) => {
      const body = z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          partySize: z.number().int().optional(),
          diningAreaId: z.number().int().optional().nullable(),
        })
        .parse(req.body);
      ok(
        res,
        serializeReservationAdmin(
          rescheduleReservation(data, { reservationId: parseId(req.params.id), ...body }),
        ),
      );
    }),
  );

  router.get(
    '/tables',
    asyncHandler((req, res) => {
      const location = data.restaurant.getLocation();
      const date =
        typeof req.query.date === 'string'
          ? req.query.date
          : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const reservations = todayReservations(data, date);
      const areas = data.restaurant.listDiningAreas(location.id);
      ok(
        res,
        data.tables.listTables(location.id).map((table) => {
          const area = areas.find((item) => item.id === table.diningAreaId);
          const forTable = reservations.filter(
            (item) =>
              item.assignedTableId === table.id ||
              item.assignedCombination?.tableIds.includes(table.id),
          );
          const current =
            forTable.find((item) => ['seated', 'confirmed', 'pending'].includes(item.status)) ?? null;
          const next = forTable.find((item) => item.id !== current?.id) ?? null;
          return serializeTable(table, area?.name || '', current, next);
        }),
      );
    }),
  );

  router.get(
    '/waitlist',
    asyncHandler((req, res) => {
      ok(
        res,
        data.waitlist
          .list({
            date: typeof req.query.date === 'string' ? req.query.date : undefined,
            status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
          })
          .map((entry) => ({
            ...serializeWaitlist(entry),
            guest: data.guests.getById(entry.guestId),
          })),
      );
    }),
  );

  router.post(
    '/waitlist/:id/offer',
    asyncHandler((req, res) => {
      ok(res, serializeWaitlist(offerWaitlist(data, parseId(req.params.id))));
    }),
  );

  router.get(
    '/orders',
    asyncHandler((req, res) => {
      ok(
        res,
        data.orders
          .list({
            status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
            type: typeof req.query.type === 'string' ? (req.query.type as never) : undefined,
          })
          .map((order) => ({
            ...serializeOrder(order),
            guest: data.guests.getById(order.guestId),
          })),
      );
    }),
  );

  router.post(
    '/orders/:id/status',
    asyncHandler((req, res) => {
      const body = z.object({ status: z.enum(ORDER_STATUSES) }).parse(req.body);
      ok(res, serializeOrder(updateOrderStatus(data, parseId(req.params.id), body.status)));
    }),
  );

  router.get(
    '/menu',
    asyncHandler((_req, res) => {
      const location = data.restaurant.getLocation();
      ok(res, {
        categories: data.menu.listCategories(location.id),
        items: data.menu.listItems(location.id).map(serializeMenuItem),
      });
    }),
  );

  router.post(
    '/menu/categories',
    asyncHandler((req, res) => {
      const body = z
        .object({
          name: z.string().min(1),
          slug: z.string().min(1),
          sortOrder: z.number().int().default(0),
        })
        .parse(req.body);
      const location = data.restaurant.getLocation();
      ok(res, data.menu.createCategory({ locationId: location.id, isActive: true, ...body }), 201);
    }),
  );

  router.patch(
    '/menu/categories/:id',
    asyncHandler((req, res) => {
      const body = z
        .object({
          name: z.string().min(1).optional(),
          slug: z.string().min(1).optional(),
          sortOrder: z.number().int().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      ok(res, data.menu.updateCategory(parseId(req.params.id), body));
    }),
  );

  router.patch(
    '/menu/items/:id',
    asyncHandler((req, res) => {
      const body = z
        .object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          price: z.number().int().optional(),
          isAvailable: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
        })
        .parse(req.body);
      ok(res, serializeMenuItem(data.menu.updateItem(parseId(req.params.id), body as never)));
    }),
  );

  router.get(
    '/guests',
    asyncHandler((_req, res) => {
      ok(
        res,
        data.guests.listAll().map((guest) => {
          const profile = guestProfile(data, guest.id);
          return profile ? serializeGuestProfile(profile, true) : guest;
        }),
      );
    }),
  );

  router.get(
    '/guests/:id',
    asyncHandler((req, res) => {
      const profile = guestProfile(data, parseId(req.params.id));
      if (!profile) throw new AppError('Guest not found', 404, 'GUEST_NOT_FOUND');
      ok(res, {
        ...serializeGuestProfile(profile, true),
        timeline: guestTimeline(data, profile.guest.id),
      });
    }),
  );

  router.patch(
    '/guests/:id',
    asyncHandler((req, res) => {
      const body = z
        .object({
          staffNotes: z.string().max(1000).nullable().optional(),
          notes: z.string().max(500).nullable().optional(),
        })
        .parse(req.body);
      const guestId = parseId(req.params.id);
      const current = data.guests.getPreferences(guestId);
      data.guests.updatePreferences(guestId, {
        ...current,
        staffNotes: body.staffNotes === undefined ? current.staffNotes : body.staffNotes,
        notes: body.notes === undefined ? current.notes : body.notes,
      });
      const profile = guestProfile(data, guestId);
      ok(res, profile ? serializeGuestProfile(profile, true) : null);
    }),
  );

  router.get(
    '/loyalty',
    asyncHandler((_req, res) => {
      ok(
        res,
        data.guests.listAll().map((guest) => {
          const snapshot = loyaltySnapshot(data, guest.id);
          return {
            guest,
            balance: snapshot.balance,
            transactions: snapshot.transactions,
          };
        }),
      );
    }),
  );

  router.post(
    '/loyalty/:guestId/adjust',
    asyncHandler((req, res) => {
      const body = z
        .object({
          amount: z.number().int(),
          note: z.string().min(1).max(280),
        })
        .parse(req.body);
      ok(res, adjustLoyalty(data, parseId(req.params.guestId), body.amount, body.note));
    }),
  );

  router.get(
    '/events',
    asyncHandler((_req, res) => {
      ok(res, data.events.list(80));
    }),
  );

  mountErrorHandler(router);
  return router;
}

export const adminRouter = createAdminRouter();
