import { AppError } from '../../errors.js';
import type { Order } from '../../types.js';
import type { POSProvider } from '../types.js';

export function createLocalPosProvider(): POSProvider {
  return {
    submitOrder(order: Order) {
      return { accepted: true, externalId: `local-${order.id}` };
    },
  };
}

export function createExternalPosProvider(): POSProvider {
  return {
    submitOrder() {
      throw new AppError(
        'POS adapter is not configured. Implement an iiko / r_keeper / Quick Resto provider.',
        501,
        'POS_NOT_CONFIGURED',
      );
    },
  };
}
