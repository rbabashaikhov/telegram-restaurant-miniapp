import { Router } from 'express';
import { isDemoAdminPreviewEnabled } from '../config.js';
import { AppError } from '../errors.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
import { dashboardKpis } from '../services/analytics.js';
import { guestProfile, guestTimeline } from '../services/guests.js';
import { loyaltySnapshot } from '../services/loyalty.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';
import {
  serializeGuestProfile,
  serializeMenuItem,
  serializeOrder,
  serializeReservationAdmin,
  serializeTable,
  serializeWaitlist,
} from './serialize.js';

export function createDemoAdminRouter(
  data: Providers = defaultProviders,
  options?: { isEnabled?: () => boolean },
): Router {
  const router = Router();
  const isEnabled = options?.isEnabled ?? (() => isDemoAdminPreviewEnabled());

  router.use((req, res, next) => {
    if (!isEnabled()) {
      res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({
        ok: false,
        error: { code: 'DEMO_READ_ONLY', message: 'Demo admin is read-only' },
      });
      return;
    }
    next();
  });

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
          })
          .map(serializeReservationAdmin),
      );
    }),
  );

  router.get(
    '/orders',
    asyncHandler((_req, res) => {
      ok(
        res,
        data.orders.list().map((order) => ({
          ...serializeOrder(order),
          guest: data.guests.getById(order.guestId),
        })),
      );
    }),
  );

  router.get(
    '/tables',
    asyncHandler((_req, res) => {
      const location = data.restaurant.getLocation();
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const reservations = data.reservations.list({ date });
      const areas = data.restaurant.listDiningAreas(location.id);
      ok(
        res,
        data.tables.listTables(location.id).map((table) => {
          const area = areas.find((item) => item.id === table.diningAreaId);
          const current =
            reservations.find(
              (item) =>
                item.assignedTableId === table.id ||
                item.assignedCombination?.tableIds.includes(table.id),
            ) ?? null;
          return serializeTable(table, area?.name || '', current, null);
        }),
      );
    }),
  );

  router.get(
    '/waitlist',
    asyncHandler((_req, res) => {
      ok(
        res,
        data.waitlist.list().map((entry) => ({
          ...serializeWaitlist(entry),
          guest: data.guests.getById(entry.guestId),
        })),
      );
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

  router.get(
    '/loyalty',
    asyncHandler((_req, res) => {
      ok(
        res,
        data.guests.listAll().map((guest) => {
          const snapshot = loyaltySnapshot(data, guest.id);
          return { guest, balance: snapshot.balance, transactions: snapshot.transactions };
        }),
      );
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

  mountErrorHandler(router);
  return router;
}

export const demoAdminRouter = createDemoAdminRouter();
