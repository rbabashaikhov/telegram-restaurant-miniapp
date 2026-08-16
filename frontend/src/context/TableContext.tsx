import { createContext, useContext, type ReactNode } from 'react';

interface TableSession {
  code: string | null;
}

const TableContext = createContext<TableSession>({ code: null });

export function TableProvider({ code, children }: { code: string | null; children: ReactNode }) {
  return <TableContext.Provider value={{ code }}>{children}</TableContext.Provider>;
}

export function useTableSession(): TableSession {
  return useContext(TableContext);
}
