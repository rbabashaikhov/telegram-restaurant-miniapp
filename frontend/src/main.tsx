import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import App from './App';
import { api, setTelegramInitData } from './api/client';
import { AppContext, type AppContextValue } from './context/AppContext';
import { BusinessContext, DEFAULT_APP_CONFIG } from './context/BusinessContext';
import { CartProvider } from './context/CartContext';
import { ReservationProvider } from './context/ReservationContext';
import { TableProvider } from './context/TableContext';
import { restaurantDemoTour } from './demo-tour/autoTour';
import { DemoTourProvider } from './demo-tour/DemoTourProvider';
import type { AppConfig } from './types';
import './styles.css';

const DEMO_USER = {
  id: 999000001,
  username: 'demo_client',
  firstName: 'Иван',
  lastName: 'Петров',
};

function tableFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('table');
  return raw ? raw.toUpperCase() : null;
}

function Root() {
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [tableCode] = useState<string | null>(tableFromLocation);
  const [context, setContext] = useState<AppContextValue>({
    user: DEMO_USER,
    isDemo: true,
    isTelegram: false,
  });

  useEffect(() => {
    let cancelled = false;
    api
      .getConfig()
      .then((data) => {
        if (cancelled) return;
        setBusiness(data);
        document.title = data.appTitle;
        if (data.branding?.accent) {
          document.documentElement.style.setProperty('--accent', data.branding.accent);
        }
      })
      .catch(() => {
        if (!cancelled) setBusiness(DEFAULT_APP_CONFIG);
      });

    try {
      const tg = WebApp;
      tg.ready();
      tg.expand();
      const initData = tg.initData || '';
      const user = tg.initDataUnsafe?.user;
      if (initData && user?.id) {
        setTelegramInitData(initData);
        setContext({
          user: {
            id: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
          },
          isDemo: false,
          isTelegram: true,
        });
      } else {
        setTelegramInitData('');
        setContext({ user: DEMO_USER, isDemo: true, isTelegram: false });
      }
    } catch {
      setTelegramInitData('');
      setContext({ user: DEMO_USER, isDemo: true, isTelegram: false });
    } finally {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => context, [context]);

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="loading">Загрузка…</div>
      </div>
    );
  }

  return (
    <BusinessContext.Provider value={business}>
      <AppContext.Provider value={value}>
        <TableProvider code={tableCode}>
          <CartProvider>
            <ReservationProvider>
              <BrowserRouter>
                <DemoTourProvider definition={restaurantDemoTour}>
                  <App />
                </DemoTourProvider>
              </BrowserRouter>
            </ReservationProvider>
          </CartProvider>
        </TableProvider>
      </AppContext.Provider>
    </BusinessContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
