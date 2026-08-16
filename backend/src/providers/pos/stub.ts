import { AppError } from '../../errors.js';
import type { Providers } from '../types.js';

export function createExternalDataStub(): Providers {
  const notConfigured = (method: string): never => {
    throw new AppError(
      `External data adapter is not configured. Implement a vendor provider for ${method}.`,
      501,
      'POS_NOT_CONFIGURED',
      { method },
    );
  };

  const stub = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return () => notConfigured(String(prop));
      },
    },
  );

  return {
    restaurant: stub as Providers['restaurant'],
    tables: stub as Providers['tables'],
    menu: stub as Providers['menu'],
    guests: stub as Providers['guests'],
    reservations: stub as Providers['reservations'],
    availability: stub as Providers['availability'],
    orders: stub as Providers['orders'],
    loyalty: stub as Providers['loyalty'],
    waitlist: stub as Providers['waitlist'],
    payments: stub as Providers['payments'],
    pos: stub as Providers['pos'],
    events: stub as Providers['events'],
    idempotency: stub as Providers['idempotency'],
    transaction<T>(fn: () => T): T {
      return fn();
    },
  };
}
