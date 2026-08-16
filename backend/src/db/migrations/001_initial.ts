import type Database from 'better-sqlite3';

export function applyInitialSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE restaurants (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE locations (
      id INTEGER PRIMARY KEY,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      timezone TEXT NOT NULL,
      opening_time TEXT NOT NULL,
      closing_time TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE dining_areas (
      id INTEGER PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE tables (
      id INTEGER PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      dining_area_id INTEGER NOT NULL REFERENCES dining_areas(id),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      min_capacity INTEGER NOT NULL,
      max_capacity INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE (location_id, code)
    );

    CREATE TABLE table_combinations (
      id INTEGER PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      dining_area_id INTEGER NOT NULL REFERENCES dining_areas(id),
      name TEXT NOT NULL,
      min_capacity INTEGER NOT NULL,
      max_capacity INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE table_combination_members (
      combination_id INTEGER NOT NULL REFERENCES table_combinations(id) ON DELETE CASCADE,
      table_id INTEGER NOT NULL REFERENCES tables(id),
      PRIMARY KEY (combination_id, table_id)
    );

    CREATE TABLE table_blocks (
      id INTEGER PRIMARY KEY,
      table_id INTEGER NOT NULL REFERENCES tables(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT NOT NULL
    );

    CREATE TABLE guests (
      id INTEGER PRIMARY KEY,
      telegram_user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      username TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE guest_preferences (
      guest_id INTEGER PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
      preferred_dining_area_id INTEGER REFERENCES dining_areas(id),
      dietary_preferences TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      staff_notes TEXT
    );

    CREATE TABLE menu_categories (
      id INTEGER PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES menu_categories(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      prep_time_minutes INTEGER NOT NULL DEFAULT 15,
      tags TEXT NOT NULL DEFAULT '[]',
      allergens TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE modifier_groups (
      id INTEGER PRIMARY KEY,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      required INTEGER NOT NULL DEFAULT 0,
      min_select INTEGER NOT NULL DEFAULT 0,
      max_select INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE modifiers (
      id INTEGER PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_delta INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE reservations (
      id INTEGER PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      dining_area_id INTEGER REFERENCES dining_areas(id),
      assigned_table_id INTEGER REFERENCES tables(id),
      assigned_combination_id INTEGER REFERENCES table_combinations(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      status TEXT NOT NULL,
      occasion TEXT NOT NULL,
      wishes TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_reservations_date ON reservations(location_id, date, status);

    CREATE TABLE reservation_history (
      id INTEGER PRIMARY KEY,
      reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      location_id INTEGER NOT NULL REFERENCES locations(id),
      reservation_id INTEGER REFERENCES reservations(id),
      table_id INTEGER REFERENCES tables(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      pickup_at TEXT,
      comment TEXT,
      subtotal INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      comment TEXT
    );

    CREATE TABLE order_item_modifiers (
      id INTEGER PRIMARY KEY,
      order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
      name TEXT NOT NULL,
      price_delta INTEGER NOT NULL
    );

    CREATE TABLE loyalty_accounts (
      id INTEGER PRIMARY KEY,
      guest_id INTEGER NOT NULL UNIQUE REFERENCES guests(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE loyalty_transactions (
      id INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES loyalty_accounts(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      order_id INTEGER REFERENCES orders(id),
      note TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE waitlist_entries (
      id INTEGER PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      location_id INTEGER NOT NULL REFERENCES locations(id),
      date TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      dining_area_id INTEGER REFERENCES dining_areas(id),
      status TEXT NOT NULL,
      offered_reservation_id INTEGER REFERENCES reservations(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE business_events (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE idempotency_keys (
      key TEXT NOT NULL,
      scope TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (key, scope)
    );

    CREATE TABLE order_counters (
      location_id INTEGER PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 1000
    );
  `);
}
