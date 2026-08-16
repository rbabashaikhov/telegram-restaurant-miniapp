import type { Providers } from '../providers/types.js';
import type { DashboardKpis } from '../types.js';

function todayDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dashboardKpis(data: Providers, now = new Date()): DashboardKpis {
  const today = todayDate(now);
  const reservationsToday = data.reservations.list({ date: today });
  const orders = data.orders.list();
  const ordersToday = orders.filter((order) => order.createdAt.slice(0, 10) === today || order.createdAt.includes(today));
  const completedToday = ordersToday.filter((order) => order.status === 'completed' || order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'submitted');
  const revenueToday = completedToday.reduce((sum, order) => sum + order.total, 0);
  const preorderRevenue = orders
    .filter((order) => order.type === 'reservation_preorder' && order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);
  const waitlistWaiting = data.waitlist.list({ status: 'waiting' }).length;
  const guests = data.guests.listAll();
  const returningGuests = guests.filter((guest) => data.reservations.listByGuest(guest.id).length > 1 || data.orders.listByGuest(guest.id).length > 1).length;
  const noShows = data.reservations.list({}).filter((item) => item.status === 'no_show');
  const closed = data.reservations.list({}).filter((item) => ['completed', 'no_show', 'cancelled'].includes(item.status));
  const guestsToday = reservationsToday.reduce((sum, item) => sum + item.partySize, 0);

  return {
    reservationsToday: reservationsToday.filter((item) => item.status !== 'cancelled').length,
    guestsToday,
    ordersToday: ordersToday.length,
    preorderRevenue,
    averageOrder: completedToday.length ? Math.round(revenueToday / completedToday.length) : 0,
    waitlistWaiting,
    returningGuests,
    noShowCount: noShows.length,
    noShowRate: closed.length ? Math.round((noShows.length / closed.length) * 100) : null,
    completedOrders: orders.filter((order) => order.status === 'completed').length,
  };
}
