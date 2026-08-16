import type {
  AppConfig,
  AvailabilitySlot,
  CartLineInput,
  DashboardKpis,
  GuestProfile,
  MenuItem,
  MenuPayload,
  Order,
  Reservation,
  RestaurantInfo,
  TablePlanItem,
  WaitlistEntry,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let initData = '';
let adminToken = '';

if (typeof sessionStorage !== 'undefined') {
  adminToken = sessionStorage.getItem('admin_token') || '';
}

export function setTelegramInitData(value: string): void {
  initData = value;
}

export function setAdminToken(value: string): void {
  adminToken = value;
  if (typeof sessionStorage !== 'undefined') {
    if (value) sessionStorage.setItem('admin_token', value);
    else sessionStorage.removeItem('admin_token');
  }
}

export function getAdminToken(): string {
  return adminToken;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (initData) headers.set('x-telegram-init-data', initData);
  if (adminToken && path.startsWith('/api/admin')) headers.set('x-admin-token', adminToken);
  if (options.method && options.method !== 'GET' && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || `Request failed (${response.status})`,
      response.status,
      payload.error?.code || 'ERROR',
    );
  }
  return (payload.data ?? payload) as T;
}

export const api = {
  getConfig: () => request<AppConfig>('/api/config'),
  getRestaurant: () => request<RestaurantInfo>('/api/restaurant'),
  getMenu: (intent?: string) => request<MenuPayload>(`/api/menu${intent ? `?intent=${intent}` : ''}`),
  getMenuItem: (id: number) => request<MenuItem>(`/api/menu/items/${id}`),
  getDinnerForTwo: (budget: number) =>
    request<{ total: number; items: MenuItem[] }>(`/api/menu/dinner-for-two?budget=${budget}`),
  getAvailability: (params: { date: string; partySize: number; diningAreaId?: number | null }) => {
    const query = new URLSearchParams({
      date: params.date,
      partySize: String(params.partySize),
    });
    if (params.diningAreaId) query.set('diningAreaId', String(params.diningAreaId));
    return request<AvailabilitySlot[]>(`/api/availability?${query.toString()}`);
  },
  createReservation: (body: Record<string, unknown>) =>
    request<Reservation>('/api/reservations', { method: 'POST', body: JSON.stringify(body) }),
  getMyReservations: () => request<Reservation[]>('/api/reservations/me'),
  cancelReservation: (id: number) =>
    request<Reservation>(`/api/reservations/${id}/cancel`, { method: 'POST', body: '{}' }),
  rescheduleReservation: (id: number, body: Record<string, unknown>) =>
    request<Reservation>(`/api/reservations/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createOrder: (body: Record<string, unknown>) =>
    request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  getMyOrders: () => request<Order[]>('/api/orders/me'),
  repeatOrder: (id: number) =>
    request<{ items: CartLineInput[]; skipped: Array<{ menuItemId: number; name: string; reason: string }> }>(
      `/api/orders/${id}/repeat`,
      { method: 'POST', body: '{}' },
    ),
  estimatePickup: (items: CartLineInput[]) =>
    request<{ minutes: number; label: string }>('/api/orders/estimate', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  getMe: () => request<GuestProfile | null>('/api/guest/me'),
  updatePreferences: (body: Record<string, unknown>) =>
    request<GuestProfile['preferences']>('/api/guest/me/preferences', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getLoyalty: () =>
    request<{ balance: number; transactions: Array<{ id: number; type: string; amount: number; note: string | null; createdAt: string }> }>(
      '/api/loyalty/me',
    ),
  joinWaitlist: (body: Record<string, unknown>) =>
    request<WaitlistEntry>('/api/waitlist', { method: 'POST', body: JSON.stringify(body) }),
  tableContext: (code: string) =>
    request<{ table: { id: number; code: string; name: string }; area: { name: string }; location: { name: string } }>(
      `/api/table/context?table=${encodeURIComponent(code)}`,
    ),
  callWaiter: (tableCode: string, note?: string) =>
    request<unknown>('/api/table/call-waiter', { method: 'POST', body: JSON.stringify({ tableCode, note }) }),
  requestBill: (tableCode: string) =>
    request<unknown>('/api/table/request-bill', { method: 'POST', body: JSON.stringify({ tableCode }) }),
  getAdminDashboard: () => request<DashboardKpis>('/api/admin/dashboard'),
  getAdminReservations: (query = '') => request<Reservation[]>(`/api/admin/reservations${query}`),
  patchReservationStatus: (id: number, status: string) =>
    request<Reservation>(`/api/admin/reservations/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  adminReschedule: (id: number, body: Record<string, unknown>) =>
    request<Reservation>(`/api/admin/reservations/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getAdminTables: () => request<TablePlanItem[]>('/api/admin/tables'),
  getAdminWaitlist: () => request<WaitlistEntry[]>('/api/admin/waitlist'),
  offerWaitlist: (id: number) =>
    request<WaitlistEntry>(`/api/admin/waitlist/${id}/offer`, { method: 'POST', body: '{}' }),
  getAdminOrders: () => request<Order[]>('/api/admin/orders'),
  patchOrderStatus: (id: number, status: string) =>
    request<Order>(`/api/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  getAdminMenu: () => request<{ categories: Array<{ id: number; name: string }>; items: MenuItem[] }>('/api/admin/menu'),
  patchMenuItem: (id: number, body: Record<string, unknown>) =>
    request<MenuItem>(`/api/admin/menu/items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAdminGuests: () => request<GuestProfile[]>('/api/admin/guests'),
  getAdminGuest: (id: number) => request<GuestProfile>(`/api/admin/guests/${id}`),
  getAdminLoyalty: () =>
    request<Array<{ guest: { id: number; name: string }; balance: number; transactions: unknown[] }>>(
      '/api/admin/loyalty',
    ),
  adjustLoyalty: (guestId: number, amount: number, note: string) =>
    request<unknown>(`/api/admin/loyalty/${guestId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    }),
  getDemoDashboard: () => request<DashboardKpis>('/api/demo-admin/dashboard'),
  getDemoReservations: () => request<Reservation[]>('/api/demo-admin/reservations'),
  getDemoOrders: () => request<Order[]>('/api/demo-admin/orders'),
  getDemoTables: () => request<TablePlanItem[]>('/api/demo-admin/tables'),
  getDemoWaitlist: () => request<WaitlistEntry[]>('/api/demo-admin/waitlist'),
  getDemoGuests: () => request<GuestProfile[]>('/api/demo-admin/guests'),
  getDemoGuest: (id: number) => request<GuestProfile>(`/api/demo-admin/guests/${id}`),
  getDemoLoyalty: () =>
    request<Array<{ guest: { id: number; name: string }; balance: number }>>('/api/demo-admin/loyalty'),
};
