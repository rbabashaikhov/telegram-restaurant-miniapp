import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { MenuItem } from '../types';
import { addLine, cartTotal, changeQty, toPayload, type CartLine } from '../lib/cart';

interface CartContextValue {
  lines: CartLine[];
  total: number;
  count: number;
  purpose: 'takeaway' | 'preorder' | 'dine_in';
  setPurpose: (purpose: CartContextValue['purpose']) => void;
  add: (item: MenuItem, modifierIds: number[], comment?: string) => void;
  change: (key: string, delta: number) => void;
  clear: () => void;
  replace: (lines: CartLine[]) => void;
  payload: ReturnType<typeof toPayload>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): CartLine[] {
  try {
    const raw = sessionStorage.getItem('nord-cart');
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);
  const [purpose, setPurpose] = useState<CartContextValue['purpose']>('takeaway');

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    sessionStorage.setItem('nord-cart', JSON.stringify(next));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      total: cartTotal(lines),
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      purpose,
      setPurpose,
      add: (item, modifierIds, comment) => persist(addLine(lines, item, modifierIds, comment)),
      change: (key, delta) => persist(changeQty(lines, key, delta)),
      clear: () => persist([]),
      replace: persist,
      payload: toPayload(lines),
    }),
    [lines, persist, purpose],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
