function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const nodeEnv = process.env.NODE_ENV || 'development';

export type DataModeName = 'local';
export type PosAdapterName = 'local' | 'external';
export type PaymentAdapterName = 'mock' | 'external';
export type EventAdapterName = 'local' | 'webhook' | 'mock';

function dataModeName(value: string | undefined): DataModeName {
  if (value === 'local') return value;
  return 'local';
}

function posAdapterName(value: string | undefined): PosAdapterName {
  if (value === 'external' || value === 'local') return value;
  return 'local';
}

function paymentAdapterName(value: string | undefined): PaymentAdapterName {
  if (value === 'external' || value === 'mock') return value;
  return 'mock';
}

function eventAdapterName(value: string | undefined): EventAdapterName {
  if (value === 'webhook' || value === 'mock' || value === 'local') return value;
  return 'local';
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.API_PORT || process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || '',
  publicDir: process.env.PUBLIC_DIR || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  allowDemoMode: process.env.ALLOW_DEMO_MODE === 'true',
  timezone: process.env.TZ || 'Europe/Moscow',
  dataMode: dataModeName(process.env.DATA_MODE),
  posAdapter: posAdapterName(process.env.POS_ADAPTER),
  paymentAdapter: paymentAdapterName(process.env.PAYMENT_ADAPTER),
  eventAdapter: eventAdapterName(process.env.EVENT_ADAPTER),
  eventWebhookUrl: (process.env.EVENT_WEBHOOK_URL || '').trim(),
  business: {
    name: process.env.BUSINESS_NAME || 'Nord Bistro',
    vertical: process.env.BUSINESS_VERTICAL || 'restaurant',
    type: process.env.BUSINESS_TYPE || 'bistro',
    title: process.env.APP_TITLE || 'Nord Bistro',
    description:
      process.env.APP_DESCRIPTION || 'Современная кухня на Цветном бульваре.',
    currency: process.env.CURRENCY || 'RUB',
    currencySymbol: process.env.CURRENCY_SYMBOL || '₽',
    brandAccent: process.env.BRAND_ACCENT || '#B85C38',
    logoUrl: process.env.BRAND_LOGO_URL || '',
  },
  restaurant: {
    durationMinutes: Number(process.env.RESERVATION_DURATION_MINUTES || 120),
    bufferMinutes: Number(process.env.RESERVATION_BUFFER_MINUTES || 15),
    slotStepMinutes: Number(process.env.SLOT_STEP_MINUTES || 30),
    openingTime: process.env.OPENING_TIME || '12:00',
    closingTime: process.env.CLOSING_TIME || '23:00',
    loyaltyEarnPercent: Number(process.env.LOYALTY_EARN_PERCENT || 5),
  },
  features: {
    demoTour: boolEnv(process.env.FEATURE_DEMO_TOUR, true),
    demoAdminPreview: boolEnv(process.env.FEATURE_DEMO_ADMIN_PREVIEW, true),
  },
  admin: {
    token: (process.env.ADMIN_TOKEN || '').trim(),
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 40),
  },
};

export function publicAppConfig() {
  return {
    businessName: config.business.name,
    businessType: config.business.type,
    businessVertical: config.business.vertical,
    appTitle: config.business.title,
    appDescription: config.business.description,
    timezone: config.timezone,
    demoMode: config.allowDemoMode,
    adminProtected: Boolean(config.admin.token),
    currency: config.business.currency,
    currencySymbol: config.business.currencySymbol,
    branding: {
      accent: config.business.brandAccent,
      logoUrl: config.business.logoUrl || null,
    },
    restaurant: {
      durationMinutes: config.restaurant.durationMinutes,
      bufferMinutes: config.restaurant.bufferMinutes,
      slotStepMinutes: config.restaurant.slotStepMinutes,
      openingTime: config.restaurant.openingTime,
      closingTime: config.restaurant.closingTime,
      loyaltyEarnPercent: config.restaurant.loyaltyEarnPercent,
    },
    features: {
      demoTour: config.features.demoTour,
      demoAdminPreview: config.features.demoAdminPreview,
    },
  };
}

export function isDemoAdminPreviewEnabled(
  cfg: {
    allowDemoMode: boolean;
    features: { demoAdminPreview: boolean };
  } = config,
): boolean {
  return cfg.allowDemoMode && cfg.features.demoAdminPreview;
}
