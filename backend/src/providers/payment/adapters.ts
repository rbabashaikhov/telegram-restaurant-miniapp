import { AppError } from '../../errors.js';
import type { PaymentProvider } from '../types.js';

export function createMockPaymentProvider(): PaymentProvider {
  return {
    createIntent(params) {
      return { id: `mock-pay-${params.orderId}`, status: 'mock' };
    },
  };
}

export function createExternalPaymentProvider(): PaymentProvider {
  return {
    createIntent() {
      throw new AppError(
        'Payment adapter is not configured. Connect a payment provider before charging guests.',
        501,
        'PAYMENT_NOT_CONFIGURED',
      );
    },
  };
}
