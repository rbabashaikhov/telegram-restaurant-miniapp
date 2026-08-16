import { config } from './config.js';
import { db } from './db/schema.js';
import { logger } from './logger.js';
import { createMockEventPublisher } from './providers/events/mock.js';
import { createWebhookEventPublisher } from './providers/events/webhook.js';
import { createLocalProviders } from './providers/local/sqlite.js';
import { createExternalPaymentProvider, createMockPaymentProvider } from './providers/payment/adapters.js';
import { createExternalPosProvider, createLocalPosProvider } from './providers/pos/adapters.js';
import type { Providers } from './providers/types.js';

function composeProviders(): Providers {
  const data = createLocalProviders(db);

  const pos = config.posAdapter === 'external' ? createExternalPosProvider() : createLocalPosProvider();
  const payments =
    config.paymentAdapter === 'external' ? createExternalPaymentProvider() : createMockPaymentProvider();

  let events = data.events;
  if (config.eventAdapter === 'mock') {
    events = createMockEventPublisher();
  } else if (config.eventAdapter === 'webhook') {
    events = createWebhookEventPublisher(data.events, config.eventWebhookUrl);
  }

  logger.info('Providers composed', {
    dataMode: config.dataMode,
    posAdapter: config.posAdapter,
    paymentAdapter: config.paymentAdapter,
    eventAdapter: config.eventAdapter,
  });

  return {
    ...data,
    pos,
    payments,
    events,
  };
}

export const providers: Providers = composeProviders();
