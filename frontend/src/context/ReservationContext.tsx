import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { nextFriday } from '../lib/format';

export interface ReservationDraft {
  date: string;
  startTime: string;
  partySize: number;
  diningAreaId: number | null;
  occasion: string;
  highChair: boolean;
  birthday: boolean;
  quietTable: boolean;
  stroller: boolean;
  comment: string;
  withPreorder: boolean;
}

const empty = (): ReservationDraft => ({
  date: nextFriday(),
  startTime: '19:00',
  partySize: 2,
  diningAreaId: null,
  occasion: 'casual',
  highChair: false,
  birthday: false,
  quietTable: false,
  stroller: false,
  comment: '',
  withPreorder: false,
});

interface ReservationContextValue {
  draft: ReservationDraft;
  setDraft: (patch: Partial<ReservationDraft>) => void;
  fillDemoFriday: (diningAreaId: number) => void;
  reset: () => void;
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [draft, setState] = useState<ReservationDraft>(empty);

  const value = useMemo<ReservationContextValue>(
    () => ({
      draft,
      setDraft: (patch) => setState((current) => ({ ...current, ...patch })),
      fillDemoFriday: (diningAreaId) =>
        setState({
          ...empty(),
          date: nextFriday(),
          startTime: '19:00',
          partySize: 2,
          diningAreaId,
          occasion: 'date',
          quietTable: true,
          withPreorder: true,
        }),
      reset: () => setState(empty()),
    }),
    [draft],
  );

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservationDraft(): ReservationContextValue {
  const ctx = useContext(ReservationContext);
  if (!ctx) throw new Error('useReservationDraft must be used within ReservationProvider');
  return ctx;
}
