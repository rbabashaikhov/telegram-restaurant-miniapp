import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { applyInitialSchema } from './migrations/001_initial.js';

const databasePath =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : process.env.DATABASE_PATH ||
      path.join(process.cwd(), 'data', 'restaurant.db');

const dir = path.dirname(databasePath);
if (databasePath !== ':memory:' && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: Database.Database = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

interface Migration {
  id: number;
  name: string;
  up: (database: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  { id: 1, name: '001_initial', up: applyInitialSchema },
];

export function migrate(database: Database.Database = db): void {
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    (
      database.prepare('SELECT id FROM schema_migrations').all() as Array<{ id: number }>
    ).map((row) => row.id),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    const apply = database.transaction(() => {
      migration.up(database);
      database
        .prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)')
        .run(migration.id, migration.name);
    });
    apply();
  }
}

export function applySchema(database: Database.Database): void {
  migrate(database);
}

migrate(db);
