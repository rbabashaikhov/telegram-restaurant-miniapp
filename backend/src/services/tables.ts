import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';

export function callWaiter(
  data: Providers,
  params: { locationId: number; tableCode: string; guestId?: number; note?: string },
) {
  const table = data.tables.getTableByCode(params.locationId, params.tableCode);
  if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
  return data.events.publish('table.call_waiter', {
    tableId: table.id,
    tableCode: table.code,
    guestId: params.guestId ?? null,
    note: params.note ?? null,
  });
}

export function requestBill(
  data: Providers,
  params: { locationId: number; tableCode: string; guestId?: number },
) {
  const table = data.tables.getTableByCode(params.locationId, params.tableCode);
  if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
  return data.events.publish('table.request_bill', {
    tableId: table.id,
    tableCode: table.code,
    guestId: params.guestId ?? null,
  });
}

export function tableContext(data: Providers, locationId: number, code: string) {
  const table = data.tables.getTableByCode(locationId, code);
  if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
  const area = data.restaurant.getDiningArea(table.diningAreaId);
  const location = data.restaurant.getLocation(locationId);
  return { table, area, location };
}
