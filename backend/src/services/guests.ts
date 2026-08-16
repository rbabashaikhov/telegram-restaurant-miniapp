import type { Providers } from '../providers/types.js';
import type { GuestProfile, Order } from '../types.js';

export function guestProfile(data: Providers, guestId: number): GuestProfile | null {
  const guest = data.guests.getById(guestId);
  if (!guest) return null;
  const preferences = data.guests.getPreferences(guestId);
  const reservations = data.reservations.listByGuest(guestId);
  const orders = data.orders.listByGuest(guestId);
  const completed = orders.filter((order) => order.status === 'completed');
  const account = data.loyalty.getOrCreateAccount(guestId);
  const counts = new Map<number, { name: string; image: string; count: number }>();
  for (const order of completed) {
    for (const item of order.items) {
      const menuItem = data.menu.getItem(item.menuItemId);
      const current = counts.get(item.menuItemId) ?? {
        name: item.name,
        image: menuItem?.image ?? '',
        count: 0,
      };
      current.count += item.quantity;
      counts.set(item.menuItemId, current);
    }
  }
  const favoriteItems = [...counts.entries()]
    .map(([menuItemId, value]) => ({ menuItemId, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const completedReservations = reservations.filter((item) => item.status === 'completed');
  const nextReservation =
    reservations.find((item) => ['pending', 'confirmed'].includes(item.status) && isUpcoming(item.date, item.startTime)) ??
    null;

  const lastVisit =
    completedReservations[0]?.date ??
    completed.sort(byCreatedDesc)[0]?.createdAt?.slice(0, 10) ??
    null;

  const totalSpend = completed.reduce((sum, order) => sum + order.total, 0);

  return {
    guest,
    preferences,
    loyaltyBalance: data.loyalty.balance(account.id),
    visits: completedReservations.length,
    reservations: reservations.length,
    orders: orders.length,
    totalSpend,
    averageCheck: completed.length ? Math.round(totalSpend / completed.length) : 0,
    lastVisit,
    favoriteItems,
    nextReservation,
    recentOrders: orders.slice(0, 5),
  };
}

function isUpcoming(date: string, time: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime() >= Date.now() - 60 * 60 * 1000;
}

function byCreatedDesc(a: Order, b: Order): number {
  return a.createdAt < b.createdAt ? 1 : -1;
}

export function guestTimeline(data: Providers, guestId: number) {
  const reservations = data.reservations.listByGuest(guestId);
  const orders = data.orders.listByGuest(guestId);
  const events = [
    ...reservations.map((item) => ({
      at: `${item.date}T${item.startTime}`,
      kind: 'reservation' as const,
      title: item.occasion,
      amount: item.preorder?.total ?? null,
      status: item.status,
      id: item.id,
    })),
    ...orders.map((item) => ({
      at: item.createdAt,
      kind: 'order' as const,
      title: item.type,
      amount: item.total,
      status: item.status,
      id: item.id,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return events;
}
