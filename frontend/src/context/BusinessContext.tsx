import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName: 'Nord Bistro',
  businessType: 'bistro',
  businessVertical: 'restaurant',
  appTitle: 'Nord Bistro',
  appDescription: 'Современная кухня на Цветном бульваре.',
  timezone: 'Europe/Moscow',
  demoMode: true,
  adminProtected: true,
  currency: 'RUB',
  currencySymbol: '₽',
  branding: { accent: '#B85C38', logoUrl: null },
  restaurant: {
    durationMinutes: 120,
    bufferMinutes: 15,
    slotStepMinutes: 30,
    openingTime: '12:00',
    closingTime: '23:00',
    loyaltyEarnPercent: 5,
  },
  features: { demoTour: true, demoAdminPreview: true },
};

export const BusinessContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useBusiness(): AppConfig {
  return useContext(BusinessContext);
}
