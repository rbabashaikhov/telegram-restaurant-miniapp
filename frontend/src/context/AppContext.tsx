import { createContext, useContext } from 'react';

export interface AppUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface AppContextValue {
  user: AppUser;
  isDemo: boolean;
  isTelegram: boolean;
}

export const AppContext = createContext<AppContextValue>({
  user: { id: 999000001, username: 'demo_client', firstName: 'Иван', lastName: 'Петров' },
  isDemo: true,
  isTelegram: false,
});

export function useApp(): AppContextValue {
  return useContext(AppContext);
}
