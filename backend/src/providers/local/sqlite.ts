import type Database from 'better-sqlite3';
import type {
  DiningArea,
  Guest,
  GuestPreference,
  Location,
  LoyaltyAccount,
  LoyaltyTransaction,
  MenuCategory,
  MenuItem,
  Modifier,
  ModifierGroup,
  OccupancyInterval,
  Order,
  OrderItem,
  Reservation,
  ReservationDetails,
  ReservationHistoryEntry,
  Restaurant,
  Table,
  TableBlock,
  TableCombination,
  WaitlistEntry,
} from '../../types.js';
import { ACTIVE_RESERVATION_STATUSES } from '../../types.js';
import { selectAssignment } from '../../domain/availability.js';
import type {
  AvailabilityPort,
  EventProvider,
  GuestProvider,
  IdempotencyProvider,
  LoyaltyProvider,
  MenuProvider,
  OrderProvider,
  Providers,
  ReservationProvider,
  RestaurantProvider,
  TableProvider,
  WaitlistProvider,
} from '../types.js';

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapRestaurant(row: Record<string, unknown>): Restaurant {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    createdAt: String(row.created_at),
  };
}

function mapLocation(row: Record<string, unknown>): Location {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    timezone: String(row.timezone),
    openingTime: String(row.opening_time),
    closingTime: String(row.closing_time),
    isActive: Boolean(row.is_active),
  };
}

function mapDiningArea(row: Record<string, unknown>): DiningArea {
  return {
    id: Number(row.id),
    locationId: Number(row.location_id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    isActive: Boolean(row.is_active),
  };
}

function mapTable(row: Record<string, unknown>): Table {
  return {
    id: Number(row.id),
    locationId: Number(row.location_id),
    diningAreaId: Number(row.dining_area_id),
    code: String(row.code),
    name: String(row.name),
    minCapacity: Number(row.min_capacity),
    maxCapacity: Number(row.max_capacity),
    isActive: Boolean(row.is_active),
  };
}

function mapGuest(row: Record<string, unknown>): Guest {
  return {
    id: Number(row.id),
    telegramUserId: Number(row.telegram_user_id),
    name: String(row.name),
    phone: (row.phone as string | null) ?? null,
    username: (row.username as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapCategory(row: Record<string, unknown>): MenuCategory {
  return {
    id: Number(row.id),
    locationId: Number(row.location_id),
    name: String(row.name),
    slug: String(row.slug),
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
  };
}

function mapReservation(row: Record<string, unknown>): Reservation {
  return {
    id: Number(row.id),
    locationId: Number(row.location_id),
    guestId: Number(row.guest_id),
    diningAreaId: row.dining_area_id == null ? null : Number(row.dining_area_id),
    assignedTableId: row.assigned_table_id == null ? null : Number(row.assigned_table_id),
    assignedCombinationId:
      row.assigned_combination_id == null ? null : Number(row.assigned_combination_id),
    date: String(row.date),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    partySize: Number(row.party_size),
    status: row.status as Reservation['status'],
    occasion: row.occasion as Reservation['occasion'],
    wishes: parseJson(String(row.wishes || '{}'), {}),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapWaitlist(row: Record<string, unknown>): WaitlistEntry {
  return {
    id: Number(row.id),
    guestId: Number(row.guest_id),
    locationId: Number(row.location_id),
    date: String(row.date),
    preferredTime: String(row.preferred_time),
    partySize: Number(row.party_size),
    diningAreaId: row.dining_area_id == null ? null : Number(row.dining_area_id),
    status: row.status as WaitlistEntry['status'],
    offeredReservationId:
      row.offered_reservation_id == null ? null : Number(row.offered_reservation_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createLocalProviders(database: Database.Database): Omit<
  Providers,
  'payments' | 'pos' | 'events'
> & { events: EventProvider } {
  const loadCombination = (id: number): TableCombination | undefined => {
    const row = database
      .prepare('SELECT * FROM table_combinations WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const members = database
      .prepare('SELECT table_id FROM table_combination_members WHERE combination_id = ?')
      .all(id) as Array<{ table_id: number }>;
    return {
      id: Number(row.id),
      locationId: Number(row.location_id),
      diningAreaId: Number(row.dining_area_id),
      name: String(row.name),
      minCapacity: Number(row.min_capacity),
      maxCapacity: Number(row.max_capacity),
      isActive: Boolean(row.is_active),
      tableIds: members.map((member) => member.table_id),
    };
  };

  const loadItem = (id: number): MenuItem | undefined => {
    const row = database
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const groups = database
      .prepare('SELECT * FROM modifier_groups WHERE menu_item_id = ? ORDER BY sort_order, id')
      .all(id) as Array<Record<string, unknown>>;
    const modifierGroups: ModifierGroup[] = groups.map((group) => {
      const modifiers = database
        .prepare('SELECT * FROM modifiers WHERE group_id = ? ORDER BY sort_order, id')
        .all(group.id) as Array<Record<string, unknown>>;
      return {
        id: Number(group.id),
        menuItemId: Number(group.menu_item_id),
        name: String(group.name),
        required: Boolean(group.required),
        minSelect: Number(group.min_select),
        maxSelect: Number(group.max_select),
        modifiers: modifiers.map(
          (modifier): Modifier => ({
            id: Number(modifier.id),
            groupId: Number(modifier.group_id),
            name: String(modifier.name),
            priceDelta: Number(modifier.price_delta),
            isActive: Boolean(modifier.is_active),
            sortOrder: Number(modifier.sort_order),
          }),
        ),
      };
    });
    return {
      id: Number(row.id),
      categoryId: Number(row.category_id),
      name: String(row.name),
      description: String(row.description),
      price: Number(row.price),
      image: String(row.image),
      isAvailable: Boolean(row.is_available),
      prepTimeMinutes: Number(row.prep_time_minutes),
      tags: parseJson(String(row.tags), []),
      allergens: parseJson(String(row.allergens), []),
      sortOrder: Number(row.sort_order),
      modifierGroups,
    };
  };

  const loadOrder = (id: number): Order | undefined => {
    const row = database
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const items = database
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
      .all(id) as Array<Record<string, unknown>>;
    const mappedItems: OrderItem[] = items.map((item) => {
      const modifiers = database
        .prepare('SELECT * FROM order_item_modifiers WHERE order_item_id = ?')
        .all(item.id) as Array<Record<string, unknown>>;
      return {
        id: Number(item.id),
        orderId: Number(item.order_id),
        menuItemId: Number(item.menu_item_id),
        name: String(item.name),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
        comment: (item.comment as string | null) ?? null,
        modifiers: modifiers.map((modifier) => ({
          id: Number(modifier.id),
          orderItemId: Number(modifier.order_item_id),
          modifierId: Number(modifier.modifier_id),
          name: String(modifier.name),
          priceDelta: Number(modifier.price_delta),
        })),
      };
    });
    return {
      id: Number(row.id),
      number: String(row.number),
      guestId: Number(row.guest_id),
      locationId: Number(row.location_id),
      reservationId: row.reservation_id == null ? null : Number(row.reservation_id),
      tableId: row.table_id == null ? null : Number(row.table_id),
      type: row.type as Order['type'],
      status: row.status as Order['status'],
      pickupAt: (row.pickup_at as string | null) ?? null,
      comment: (row.comment as string | null) ?? null,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      items: mappedItems,
    };
  };

  const restaurant: RestaurantProvider = {
    getRestaurant() {
      const row = database.prepare('SELECT * FROM restaurants LIMIT 1').get() as Record<
        string,
        unknown
      >;
      return mapRestaurant(row);
    },
    getLocation(id = 1) {
      const row = database
        .prepare('SELECT * FROM locations WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      if (!row) {
        const fallback = database.prepare('SELECT * FROM locations LIMIT 1').get() as Record<
          string,
          unknown
        >;
        return mapLocation(fallback);
      }
      return mapLocation(row);
    },
    listLocations() {
      return (database.prepare('SELECT * FROM locations').all() as Array<Record<string, unknown>>).map(
        mapLocation,
      );
    },
    listDiningAreas(locationId) {
      return (
        database
          .prepare('SELECT * FROM dining_areas WHERE location_id = ? ORDER BY id')
          .all(locationId) as Array<Record<string, unknown>>
      ).map(mapDiningArea);
    },
    getDiningArea(id) {
      const row = database
        .prepare('SELECT * FROM dining_areas WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapDiningArea(row) : undefined;
    },
  };

  const tables: TableProvider = {
    listTables(locationId) {
      return (
        database
          .prepare('SELECT * FROM tables WHERE location_id = ? ORDER BY code')
          .all(locationId) as Array<Record<string, unknown>>
      ).map(mapTable);
    },
    getTable(id) {
      const row = database
        .prepare('SELECT * FROM tables WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapTable(row) : undefined;
    },
    getTableByCode(locationId, code) {
      const row = database
        .prepare('SELECT * FROM tables WHERE location_id = ? AND code = ?')
        .get(locationId, code) as Record<string, unknown> | undefined;
      return row ? mapTable(row) : undefined;
    },
    listCombinations(locationId) {
      const rows = database
        .prepare('SELECT id FROM table_combinations WHERE location_id = ?')
        .all(locationId) as Array<{ id: number }>;
      return rows.map((row) => loadCombination(row.id)!).filter(Boolean);
    },
    getCombination(id) {
      return loadCombination(id);
    },
    listBlocks(locationId, date) {
      return (
        database
          .prepare(
            `SELECT b.* FROM table_blocks b
             JOIN tables t ON t.id = b.table_id
             WHERE t.location_id = ? AND b.date = ?`,
          )
          .all(locationId, date) as Array<Record<string, unknown>>
      ).map(
        (row): TableBlock => ({
          id: Number(row.id),
          tableId: Number(row.table_id),
          date: String(row.date),
          startTime: String(row.start_time),
          endTime: String(row.end_time),
          reason: String(row.reason),
        }),
      );
    },
    createBlock(params) {
      const result = database
        .prepare(
          `INSERT INTO table_blocks (table_id, date, start_time, end_time, reason)
           VALUES (@tableId, @date, @startTime, @endTime, @reason)`,
        )
        .run(params);
      return { ...params, id: Number(result.lastInsertRowid) };
    },
  };

  const menu: MenuProvider = {
    listCategories(locationId) {
      return (
        database
          .prepare(
            'SELECT * FROM menu_categories WHERE location_id = ? ORDER BY sort_order, id',
          )
          .all(locationId) as Array<Record<string, unknown>>
      ).map(mapCategory);
    },
    getCategory(id) {
      const row = database
        .prepare('SELECT * FROM menu_categories WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapCategory(row) : undefined;
    },
    createCategory(params) {
      const result = database
        .prepare(
          `INSERT INTO menu_categories (location_id, name, slug, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(params.locationId, params.name, params.slug, params.sortOrder, params.isActive ? 1 : 0);
      return menu.getCategory(Number(result.lastInsertRowid))!;
    },
    updateCategory(id, patch) {
      const current = menu.getCategory(id);
      if (!current) throw new Error('Category not found');
      const next = { ...current, ...patch };
      database
        .prepare(
          `UPDATE menu_categories SET name = ?, slug = ?, sort_order = ?, is_active = ? WHERE id = ?`,
        )
        .run(next.name, next.slug, next.sortOrder, next.isActive ? 1 : 0, id);
      return menu.getCategory(id)!;
    },
    listItems(locationId, options) {
      const categories = menu.listCategories(locationId).map((category) => category.id);
      if (categories.length === 0) return [];
      const placeholders = categories.map(() => '?').join(',');
      const rows = database
        .prepare(
          `SELECT id FROM menu_items WHERE category_id IN (${placeholders}) ORDER BY sort_order, id`,
        )
        .all(...categories) as Array<{ id: number }>;
      return rows
        .map((row) => loadItem(row.id)!)
        .filter((item) => (options?.availableOnly ? item.isAvailable : true));
    },
    getItem(id) {
      return loadItem(id);
    },
    createItem(params) {
      const result = database
        .prepare(
          `INSERT INTO menu_items (category_id, name, description, price, image, is_available, prep_time_minutes, tags, allergens, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.categoryId,
          params.name,
          params.description,
          params.price,
          params.image,
          params.isAvailable ? 1 : 0,
          params.prepTimeMinutes,
          JSON.stringify(params.tags),
          JSON.stringify(params.allergens),
          params.sortOrder,
        );
      return loadItem(Number(result.lastInsertRowid))!;
    },
    updateItem(id, patch) {
      const current = loadItem(id);
      if (!current) throw new Error('Item not found');
      const next = { ...current, ...patch };
      database
        .prepare(
          `UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, image = ?,
           is_available = ?, prep_time_minutes = ?, tags = ?, allergens = ?, sort_order = ? WHERE id = ?`,
        )
        .run(
          next.categoryId,
          next.name,
          next.description,
          next.price,
          next.image,
          next.isAvailable ? 1 : 0,
          next.prepTimeMinutes,
          JSON.stringify(next.tags),
          JSON.stringify(next.allergens),
          next.sortOrder,
          id,
        );
      return loadItem(id)!;
    },
    setItemAvailability(id, isAvailable) {
      database.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?').run(isAvailable ? 1 : 0, id);
      return loadItem(id)!;
    },
  };

  const guests: GuestProvider = {
    upsert(user, extras) {
      const existing = guests.getByTelegramUserId(user.id);
      const name =
        extras?.name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.username ||
        'Гость';
      if (existing) {
        if (extras?.phone || extras?.name) {
          return { guest: guests.update(existing.id, { name, phone: extras.phone }), created: false };
        }
        return { guest: existing, created: false };
      }
      const result = database
        .prepare(
          `INSERT INTO guests (telegram_user_id, name, phone, username) VALUES (?, ?, ?, ?)`,
        )
        .run(user.id, name, extras?.phone ?? null, user.username ?? null);
      const guest = guests.getById(Number(result.lastInsertRowid))!;
      database
        .prepare(
          `INSERT INTO guest_preferences (guest_id, dietary_preferences) VALUES (?, '[]')`,
        )
        .run(guest.id);
      return { guest, created: true };
    },
    getById(id) {
      const row = database
        .prepare('SELECT * FROM guests WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapGuest(row) : undefined;
    },
    getByTelegramUserId(telegramUserId) {
      const row = database
        .prepare('SELECT * FROM guests WHERE telegram_user_id = ?')
        .get(telegramUserId) as Record<string, unknown> | undefined;
      return row ? mapGuest(row) : undefined;
    },
    listAll() {
      return (database.prepare('SELECT * FROM guests ORDER BY id').all() as Array<Record<string, unknown>>).map(
        mapGuest,
      );
    },
    update(id, patch) {
      const current = guests.getById(id);
      if (!current) throw new Error('Guest not found');
      const next = { ...current, ...patch };
      database
        .prepare('UPDATE guests SET name = ?, phone = ? WHERE id = ?')
        .run(next.name, next.phone, id);
      return guests.getById(id)!;
    },
    getPreferences(guestId) {
      const row = database
        .prepare('SELECT * FROM guest_preferences WHERE guest_id = ?')
        .get(guestId) as Record<string, unknown> | undefined;
      if (!row) {
        return {
          guestId,
          preferredDiningAreaId: null,
          dietaryPreferences: [],
          notes: null,
          staffNotes: null,
        };
      }
      return {
        guestId,
        preferredDiningAreaId:
          row.preferred_dining_area_id == null ? null : Number(row.preferred_dining_area_id),
        dietaryPreferences: parseJson(String(row.dietary_preferences), []),
        notes: (row.notes as string | null) ?? null,
        staffNotes: (row.staff_notes as string | null) ?? null,
      } satisfies GuestPreference;
    },
    updatePreferences(guestId, patch) {
      const current = guests.getPreferences(guestId);
      const next = { ...current, ...patch, guestId };
      database
        .prepare(
          `INSERT INTO guest_preferences (guest_id, preferred_dining_area_id, dietary_preferences, notes, staff_notes)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(guest_id) DO UPDATE SET
             preferred_dining_area_id = excluded.preferred_dining_area_id,
             dietary_preferences = excluded.dietary_preferences,
             notes = excluded.notes,
             staff_notes = excluded.staff_notes`,
        )
        .run(
          guestId,
          next.preferredDiningAreaId,
          JSON.stringify(next.dietaryPreferences),
          next.notes,
          next.staffNotes,
        );
      return guests.getPreferences(guestId);
    },
  };

  const loadReservationDetails = (id: number): ReservationDetails | undefined => {
    const row = database
      .prepare('SELECT * FROM reservations WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const reservation = mapReservation(row);
    const guest = guests.getById(reservation.guestId)!;
    const diningArea = reservation.diningAreaId
      ? restaurant.getDiningArea(reservation.diningAreaId) ?? null
      : null;
    const assignedTable = reservation.assignedTableId
      ? tables.getTable(reservation.assignedTableId) ?? null
      : null;
    const assignedCombination = reservation.assignedCombinationId
      ? tables.getCombination(reservation.assignedCombinationId) ?? null
      : null;
    const history = (
      database
        .prepare('SELECT * FROM reservation_history WHERE reservation_id = ? ORDER BY id')
        .all(id) as Array<Record<string, unknown>>
    ).map(
      (entry): ReservationHistoryEntry => ({
        id: Number(entry.id),
        reservationId: Number(entry.reservation_id),
        fromStatus: (entry.from_status as ReservationHistoryEntry['fromStatus']) ?? null,
        toStatus: entry.to_status as ReservationHistoryEntry['toStatus'],
        note: (entry.note as string | null) ?? null,
        createdAt: String(entry.created_at),
      }),
    );
    const preorderRow = database
      .prepare(`SELECT id FROM orders WHERE reservation_id = ? ORDER BY id DESC LIMIT 1`)
      .get(id) as { id: number } | undefined;
    return {
      ...reservation,
      guest,
      diningArea,
      assignedTable,
      assignedCombination,
      preorder: preorderRow ? loadOrder(preorderRow.id) ?? null : null,
      history,
    };
  };

  const reservations: ReservationProvider = {
    create(params) {
      const result = database
        .prepare(
          `INSERT INTO reservations (
            location_id, guest_id, dining_area_id, assigned_table_id, assigned_combination_id,
            date, start_time, end_time, party_size, status, occasion, wishes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.locationId,
          params.guestId,
          params.diningAreaId,
          params.assignedTableId,
          params.assignedCombinationId,
          params.date,
          params.startTime,
          params.endTime,
          params.partySize,
          params.status,
          params.occasion,
          JSON.stringify(params.wishes),
        );
      const id = Number(result.lastInsertRowid);
      reservations.addHistory({
        reservationId: id,
        fromStatus: null,
        toStatus: params.status,
        note: 'Создана',
      });
      return loadReservationDetails(id)!;
    },
    getById(id) {
      return loadReservationDetails(id);
    },
    listByGuest(guestId) {
      const rows = database
        .prepare('SELECT id FROM reservations WHERE guest_id = ? ORDER BY date DESC, start_time DESC')
        .all(guestId) as Array<{ id: number }>;
      return rows.map((row) => loadReservationDetails(row.id)!);
    },
    list(filters) {
      let sql = 'SELECT id FROM reservations WHERE 1=1';
      const args: unknown[] = [];
      if (filters.locationId) {
        sql += ' AND location_id = ?';
        args.push(filters.locationId);
      }
      if (filters.date) {
        sql += ' AND date = ?';
        args.push(filters.date);
      }
      if (filters.status) {
        sql += ' AND status = ?';
        args.push(filters.status);
      }
      sql += ' ORDER BY date, start_time, id';
      const rows = database.prepare(sql).all(...args) as Array<{ id: number }>;
      return rows.map((row) => loadReservationDetails(row.id)!);
    },
    updateStatus(id, status, note) {
      const current = loadReservationDetails(id);
      if (!current) throw new Error('Reservation not found');
      database
        .prepare(`UPDATE reservations SET status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(status, id);
      reservations.addHistory({
        reservationId: id,
        fromStatus: current.status,
        toStatus: status,
        note: note ?? null,
      });
      return loadReservationDetails(id)!;
    },
    reschedule(id, patch) {
      database
        .prepare(
          `UPDATE reservations SET date = ?, start_time = ?, end_time = ?, dining_area_id = ?,
           assigned_table_id = ?, assigned_combination_id = ?, party_size = COALESCE(?, party_size),
           updated_at = datetime('now') WHERE id = ?`,
        )
        .run(
          patch.date,
          patch.startTime,
          patch.endTime,
          patch.diningAreaId,
          patch.assignedTableId,
          patch.assignedCombinationId,
          patch.partySize ?? null,
          id,
        );
      reservations.addHistory({
        reservationId: id,
        fromStatus: loadReservationDetails(id)?.status ?? null,
        toStatus: loadReservationDetails(id)?.status ?? 'confirmed',
        note: 'Перенос',
      });
      return loadReservationDetails(id)!;
    },
    listOccupancy(locationId, date) {
      const rows = database
        .prepare(
          `SELECT id, assigned_table_id, assigned_combination_id, start_time, end_time
           FROM reservations
           WHERE location_id = ? AND date = ? AND status IN (${ACTIVE_RESERVATION_STATUSES.map(() => '?').join(',')})`,
        )
        .all(locationId, date, ...ACTIVE_RESERVATION_STATUSES) as Array<Record<string, unknown>>;
      const occupancy: OccupancyInterval[] = [];
      for (const row of rows) {
        const tableIds: number[] = [];
        if (row.assigned_table_id) tableIds.push(Number(row.assigned_table_id));
        if (row.assigned_combination_id) {
          const combo = loadCombination(Number(row.assigned_combination_id));
          if (combo) tableIds.push(...combo.tableIds);
        }
        occupancy.push({
          tableIds: [...new Set(tableIds)],
          startTime: String(row.start_time),
          endTime: String(row.end_time),
          reservationId: Number(row.id),
        });
      }
      return occupancy;
    },
    addHistory(params) {
      database
        .prepare(
          `INSERT INTO reservation_history (reservation_id, from_status, to_status, note)
           VALUES (?, ?, ?, ?)`,
        )
        .run(params.reservationId, params.fromStatus, params.toStatus, params.note);
    },
  };

  const availability: AvailabilityPort = {
    assign(params) {
      return selectAssignment({
        tables: tables.listTables(params.locationId),
        combinations: tables.listCombinations(params.locationId),
        occupancy: reservations.listOccupancy(params.locationId, params.date),
        blocks: tables.listBlocks(params.locationId, params.date),
        partySize: params.partySize,
        startTime: params.startTime,
        durationMinutes: params.durationMinutes,
        bufferMinutes: params.bufferMinutes,
        diningAreaId: params.diningAreaId,
        ignoreReservationId: params.ignoreReservationId,
      });
    },
  };

  const orders: OrderProvider = {
    nextNumber() {
      const row = database
        .prepare('SELECT last_number FROM order_counters WHERE location_id = 1')
        .get() as { last_number: number } | undefined;
      const next = (row?.last_number ?? 1000) + 1;
      database
        .prepare(
          `INSERT INTO order_counters (location_id, last_number) VALUES (1, ?)
           ON CONFLICT(location_id) DO UPDATE SET last_number = excluded.last_number`,
        )
        .run(next);
      return `NB-${next}`;
    },
    create(params) {
      const number = orders.nextNumber();
      const result = database
        .prepare(
          `INSERT INTO orders (number, guest_id, location_id, reservation_id, table_id, type, status, pickup_at, comment, subtotal, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          number,
          params.guestId,
          params.locationId,
          params.reservationId,
          params.tableId,
          params.type,
          params.status,
          params.pickupAt,
          params.comment,
          params.subtotal,
          params.total,
        );
      const orderId = Number(result.lastInsertRowid);
      const itemStmt = database.prepare(
        `INSERT INTO order_items (order_id, menu_item_id, name, quantity, unit_price, line_total, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      const modStmt = database.prepare(
        `INSERT INTO order_item_modifiers (order_item_id, modifier_id, name, price_delta)
         VALUES (?, ?, ?, ?)`,
      );
      for (const item of params.items) {
        const inserted = itemStmt.run(
          orderId,
          item.menuItemId,
          item.name,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          item.comment,
        );
        const orderItemId = Number(inserted.lastInsertRowid);
        for (const modifier of item.modifiers) {
          modStmt.run(orderItemId, modifier.modifierId, modifier.name, modifier.priceDelta);
        }
      }
      return loadOrder(orderId)!;
    },
    getById(id) {
      return loadOrder(id);
    },
    listByGuest(guestId) {
      const rows = database
        .prepare('SELECT id FROM orders WHERE guest_id = ? ORDER BY id DESC')
        .all(guestId) as Array<{ id: number }>;
      return rows.map((row) => loadOrder(row.id)!);
    },
    list(filters = {}) {
      let sql = 'SELECT id FROM orders WHERE 1=1';
      const args: unknown[] = [];
      if (filters.locationId) {
        sql += ' AND location_id = ?';
        args.push(filters.locationId);
      }
      if (filters.status) {
        sql += ' AND status = ?';
        args.push(filters.status);
      }
      if (filters.type) {
        sql += ' AND type = ?';
        args.push(filters.type);
      }
      if (filters.date) {
        sql += ` AND date(created_at) = ?`;
        args.push(filters.date);
      }
      sql += ' ORDER BY id DESC';
      const rows = database.prepare(sql).all(...args) as Array<{ id: number }>;
      return rows.map((row) => loadOrder(row.id)!);
    },
    updateStatus(id, status) {
      database
        .prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(status, id);
      return loadOrder(id)!;
    },
    getByReservationId(reservationId) {
      const row = database
        .prepare('SELECT id FROM orders WHERE reservation_id = ? ORDER BY id DESC LIMIT 1')
        .get(reservationId) as { id: number } | undefined;
      return row ? loadOrder(row.id) : undefined;
    },
  };

  const loyalty: LoyaltyProvider = {
    getOrCreateAccount(guestId) {
      const existing = loyalty.getAccountByGuest(guestId);
      if (existing) return existing;
      const result = database
        .prepare('INSERT INTO loyalty_accounts (guest_id) VALUES (?)')
        .run(guestId);
      return loyalty.getAccountByGuest(guestId) ?? {
        id: Number(result.lastInsertRowid),
        guestId,
        createdAt: new Date().toISOString(),
      };
    },
    getAccountByGuest(guestId) {
      const row = database
        .prepare('SELECT * FROM loyalty_accounts WHERE guest_id = ?')
        .get(guestId) as Record<string, unknown> | undefined;
      if (!row) return undefined;
      return {
        id: Number(row.id),
        guestId: Number(row.guest_id),
        createdAt: String(row.created_at),
      } satisfies LoyaltyAccount;
    },
    listTransactions(accountId) {
      return (
        database
          .prepare('SELECT * FROM loyalty_transactions WHERE account_id = ? ORDER BY id DESC')
          .all(accountId) as Array<Record<string, unknown>>
      ).map(
        (row): LoyaltyTransaction => ({
          id: Number(row.id),
          accountId: Number(row.account_id),
          type: row.type as LoyaltyTransaction['type'],
          amount: Number(row.amount),
          orderId: row.order_id == null ? null : Number(row.order_id),
          note: (row.note as string | null) ?? null,
          idempotencyKey: (row.idempotency_key as string | null) ?? null,
          createdAt: String(row.created_at),
        }),
      );
    },
    addTransaction(params) {
      const result = database
        .prepare(
          `INSERT INTO loyalty_transactions (account_id, type, amount, order_id, note, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.accountId,
          params.type,
          params.amount,
          params.orderId,
          params.note,
          params.idempotencyKey,
        );
      return loyalty.listTransactions(params.accountId).find((tx) => tx.id === Number(result.lastInsertRowid))!;
    },
    findByIdempotencyKey(key) {
      const row = database
        .prepare('SELECT * FROM loyalty_transactions WHERE idempotency_key = ?')
        .get(key) as Record<string, unknown> | undefined;
      if (!row) return undefined;
      return {
        id: Number(row.id),
        accountId: Number(row.account_id),
        type: row.type as LoyaltyTransaction['type'],
        amount: Number(row.amount),
        orderId: row.order_id == null ? null : Number(row.order_id),
        note: (row.note as string | null) ?? null,
        idempotencyKey: (row.idempotency_key as string | null) ?? null,
        createdAt: String(row.created_at),
      };
    },
    findEarnForOrder(orderId) {
      const row = database
        .prepare(`SELECT * FROM loyalty_transactions WHERE order_id = ? AND type = 'earned'`)
        .get(orderId) as Record<string, unknown> | undefined;
      if (!row) return undefined;
      return loyalty.findByIdempotencyKey(String(row.idempotency_key || `earn:order:${orderId}`));
    },
    balance(accountId) {
      const row = database
        .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM loyalty_transactions WHERE account_id = ?')
        .get(accountId) as { balance: number };
      return Number(row.balance);
    },
  };

  const waitlist: WaitlistProvider = {
    create(params) {
      const result = database
        .prepare(
          `INSERT INTO waitlist_entries (guest_id, location_id, date, preferred_time, party_size, dining_area_id, status)
           VALUES (?, ?, ?, ?, ?, ?, 'waiting')`,
        )
        .run(
          params.guestId,
          params.locationId,
          params.date,
          params.preferredTime,
          params.partySize,
          params.diningAreaId,
        );
      return waitlist.getById(Number(result.lastInsertRowid))!;
    },
    getById(id) {
      const row = database
        .prepare('SELECT * FROM waitlist_entries WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapWaitlist(row) : undefined;
    },
    list(filters = {}) {
      let sql = 'SELECT * FROM waitlist_entries WHERE 1=1';
      const args: unknown[] = [];
      if (filters.locationId) {
        sql += ' AND location_id = ?';
        args.push(filters.locationId);
      }
      if (filters.date) {
        sql += ' AND date = ?';
        args.push(filters.date);
      }
      if (filters.status) {
        sql += ' AND status = ?';
        args.push(filters.status);
      }
      sql += ' ORDER BY created_at';
      return (database.prepare(sql).all(...args) as Array<Record<string, unknown>>).map(mapWaitlist);
    },
    listByGuest(guestId) {
      return (
        database
          .prepare('SELECT * FROM waitlist_entries WHERE guest_id = ? ORDER BY id DESC')
          .all(guestId) as Array<Record<string, unknown>>
      ).map(mapWaitlist);
    },
    updateStatus(id, status, extra) {
      database
        .prepare(
          `UPDATE waitlist_entries SET status = ?, offered_reservation_id = COALESCE(?, offered_reservation_id),
           updated_at = datetime('now') WHERE id = ?`,
        )
        .run(status, extra?.offeredReservationId ?? null, id);
      return waitlist.getById(id)!;
    },
  };

  const events: EventProvider = {
    publish(name, payload) {
      const result = database
        .prepare('INSERT INTO business_events (name, payload) VALUES (?, ?)')
        .run(name, JSON.stringify(payload));
      return {
        id: Number(result.lastInsertRowid),
        name,
        payload,
        createdAt: new Date().toISOString(),
      };
    },
    list(limit = 50) {
      return (
        database
          .prepare('SELECT * FROM business_events ORDER BY id DESC LIMIT ?')
          .all(limit) as Array<Record<string, unknown>>
      ).map((row) => ({
        id: Number(row.id),
        name: row.name as never,
        payload: parseJson(String(row.payload), {}),
        createdAt: String(row.created_at),
      }));
    },
  };

  const idempotency: IdempotencyProvider = {
    get(key, scope) {
      const row = database
        .prepare('SELECT * FROM idempotency_keys WHERE key = ? AND scope = ?')
        .get(key, scope) as Record<string, unknown> | undefined;
      if (!row) return undefined;
      return {
        key: String(row.key),
        scope: String(row.scope),
        resourceType: String(row.resource_type),
        resourceId: Number(row.resource_id),
        createdAt: String(row.created_at),
      };
    },
    put(record) {
      database
        .prepare(
          `INSERT INTO idempotency_keys (key, scope, resource_type, resource_id)
           VALUES (?, ?, ?, ?)`,
        )
        .run(record.key, record.scope, record.resourceType, record.resourceId);
      return { ...record, createdAt: new Date().toISOString() };
    },
  };

  return {
    restaurant,
    tables,
    menu,
    guests,
    reservations,
    availability,
    orders,
    loyalty,
    waitlist,
    events,
    idempotency,
    transaction<T>(fn: () => T): T {
      return database.transaction(fn)();
    },
  };
}
