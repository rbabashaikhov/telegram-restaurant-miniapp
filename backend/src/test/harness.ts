import Database from 'better-sqlite3';
import { applySchema } from '../db/schema.js';
import { seed } from '../db/seed.js';
import { createLocalProviders } from '../providers/local/sqlite.js';
import { createMockPaymentProvider } from '../providers/payment/adapters.js';
import { createLocalPosProvider } from '../providers/pos/adapters.js';
import type { Providers } from '../providers/types.js';

export interface TestWorld {
  db: Database.Database;
  providers: Providers;
  user: { id: number; first_name: string; last_name: string; username: string };
}

export function createTestWorld(now = new Date('2026-08-16T10:00:00')): TestWorld {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db, now);
  const local = createLocalProviders(db);
  const providers: Providers = {
    ...local,
    pos: createLocalPosProvider(),
    payments: createMockPaymentProvider(),
  };
  return {
    db,
    providers,
    user: { id: 999000001, first_name: 'Иван', last_name: 'Петров', username: 'demo_client' },
  };
}
