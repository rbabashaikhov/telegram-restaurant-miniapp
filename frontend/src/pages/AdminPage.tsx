import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getAdminToken, setAdminToken } from '../api/client';
import { formatDate, formatMoney } from '../lib/format';
import { STATUS_LABELS, type DashboardKpis, type GuestProfile, type MenuItem, type Order, type Reservation, type TablePlanItem, type WaitlistEntry } from '../types';

function AdminGate({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getAdminToken());
  const [value, setValue] = useState(token);
  if (!token) {
    return (
      <div className="admin-shell">
        <h1>Admin</h1>
        <p>Введите ADMIN_TOKEN. Без токена запись закрыта.</p>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="ADMIN_TOKEN" />
        <button type="button" className="btn btn-primary" onClick={() => { setAdminToken(value); setToken(value); }}>
          Войти
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminNav({ readOnly }: { readOnly?: boolean }) {
  const base = readOnly ? '/demo/admin' : '/admin';
  return (
    <nav className="admin-nav">
      {readOnly && (
        <Link className="btn btn-secondary" to="/">
          Открыть клиентское приложение
        </Link>
      )}
      <Link to={base}>Dashboard</Link>
      <Link to={`${base}/reservations`}>Брони</Link>
      <Link to={`${base}/tables`}>Столы</Link>
      <Link to={`${base}/waitlist`}>Waitlist</Link>
      <Link to={`${base}/orders`}>Заказы</Link>
      <Link to={`${base}/menu`}>Меню</Link>
      <Link to={`${base}/guests`}>Гости</Link>
      <Link to={`${base}/loyalty`}>Бонусы</Link>
    </nav>
  );
}

export function AdminPage({ readOnly = false }: { readOnly?: boolean }) {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  useEffect(() => {
    const dash = readOnly ? api.getDemoDashboard() : api.getAdminDashboard();
    const wait = readOnly ? api.getDemoWaitlist() : api.getAdminWaitlist();
    const orderList = readOnly ? api.getDemoOrders() : api.getAdminOrders();
    const reservationList = readOnly ? api.getDemoReservations() : api.getAdminReservations();
    dash.then(setKpis).catch(() => setKpis(null));
    wait.then(setWaitlist).catch(() => setWaitlist([]));
    orderList.then(setOrders).catch(() => setOrders([]));
    reservationList.then(setReservations).catch(() => setReservations([]));
  }, [readOnly]);
  const base = readOnly ? '/demo/admin' : '/admin';
  const waitingCount = waitlist.filter((item) => item.status === 'waiting').length;
  const activeOrders = orders.filter((item) => !['completed', 'cancelled'].includes(item.status)).length;
  const pendingReservations = reservations.filter((item) => item.status === 'pending').length;
  const noShows = kpis?.noShowCount ?? 0;
  const attention = [
    waitingCount > 0 && { to: `${base}/waitlist`, label: 'Waitlist ожидает', value: waitingCount },
    activeOrders > 0 && { to: `${base}/orders`, label: 'Активные заказы', value: activeOrders },
    noShows > 0 && { to: `${base}/reservations`, label: 'No-show', value: noShows },
    pendingReservations > 0 && { to: `${base}/reservations`, label: 'Брони ждут подтверждения', value: pendingReservations },
  ].filter(Boolean) as Array<{ to: string; label: string; value: number }>;
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <p className="eyebrow">{readOnly ? 'Demo admin · только чтение' : 'Admin'}</p>
      <h1 data-demo-tour="admin-value">Guest → Reservation → Order → Repeat → Revenue</h1>
      {kpis && (
        <div className="kpi-grid">
          <Kpi label="Брони сегодня" value={kpis.reservationsToday} />
          <Kpi label="Гостей сегодня" value={kpis.guestsToday} />
          <Kpi label="Заказов сегодня" value={kpis.ordersToday} />
          <Kpi label="Выручка предзаказов" value={formatMoney(kpis.preorderRevenue)} />
          <Kpi label="Средний чек" value={formatMoney(kpis.averageOrder)} />
          <Kpi label="Waitlist" value={kpis.waitlistWaiting} />
          <Kpi label="Returning" value={kpis.returningGuests} />
          <Kpi label="No-show" value={`${kpis.noShowCount}${kpis.noShowRate != null ? ` · ${kpis.noShowRate}%` : ''}`} />
        </div>
      )}
      {attention.length > 0 && (
        <section className="attention-box">
          <h2>Требует внимания</h2>
          {attention.map((item) => (
            <Link key={item.label} className="admin-row" to={item.to}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function AdminReservationsPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<Reservation[]>([]);
  const load = () => (readOnly ? api.getDemoReservations() : api.getAdminReservations()).then(setItems);
  useEffect(() => { void load(); }, [readOnly]);
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>Брони</h1>
      {items.map((item) => (
        <article key={item.id} className="admin-row">
          <div>
            <strong>{item.startTime} · {item.guest?.name}</strong>
            <p>
              {item.partySize} гостя · {item.diningArea?.name} · {item.table?.code || item.combination?.name || '—'} · {item.occasion}
            </p>
            <p>{STATUS_LABELS[item.status]} {item.preorder ? `· предзаказ ${formatMoney(item.preorder.total)}` : ''}</p>
          </div>
          {!readOnly && (
            <div className="admin-actions">
              {['confirm', 'seat', 'complete', 'cancel', 'no_show'].map((action) => {
                const status = action === 'confirm' ? 'confirmed' : action === 'seat' ? 'seated' : action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'no_show';
                return (
                  <button key={action} type="button" onClick={() => api.patchReservationStatus(item.id, status).then(load)}>
                    {action}
                  </button>
                );
              })}
            </div>
          )}
        </article>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminTablesPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<TablePlanItem[]>([]);
  useEffect(() => {
    (readOnly ? api.getDemoTables() : api.getAdminTables()).then(setItems);
  }, [readOnly]);
  const grouped = items.reduce<Record<string, TablePlanItem[]>>((acc, table) => {
    acc[table.diningAreaName] = acc[table.diningAreaName] || [];
    acc[table.diningAreaName].push(table);
    return acc;
  }, {});
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>План зала</h1>
      {Object.entries(grouped).map(([area, tables]) => (
        <section key={area}>
          <h2>{area}</h2>
          <div className="table-grid">
            {tables.map((table) => (
              <article key={table.id} className={table.currentReservation ? 'table-tile busy' : 'table-tile'}>
                <strong>{table.code}</strong>
                <span>{table.minCapacity}–{table.maxCapacity} seats</span>
                <span>{table.currentReservation ? table.currentReservation.time : 'FREE'}</span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminWaitlistPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<WaitlistEntry[]>([]);
  const load = () => (readOnly ? api.getDemoWaitlist() : api.getAdminWaitlist()).then(setItems);
  useEffect(() => { void load(); }, [readOnly]);
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>Waitlist</h1>
      {items.map((item) => (
        <article key={item.id} className="admin-row">
          <div>
            <strong>{item.guest?.name} · {item.preferredTime}</strong>
            <p>{formatDate(item.date)} · {item.partySize} гостя · {item.status}</p>
          </div>
          {!readOnly && item.status === 'waiting' && (
            <button type="button" onClick={() => api.offerWaitlist(item.id).then(load)}>Offer</button>
          )}
        </article>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminOrdersPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<Order[]>([]);
  const load = () => (readOnly ? api.getDemoOrders() : api.getAdminOrders()).then(setItems);
  useEffect(() => { void load(); }, [readOnly]);
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>Заказы</h1>
      {items.map((item) => (
        <article key={item.id} className="admin-row">
          <div>
            <strong>{item.number} · {item.guest?.name}</strong>
            <p>{item.type} · {item.items.map((line) => line.name).join(', ')}</p>
            {item.items.some((line) => line.comment) && (
              <p>
                Пожелания:{' '}
                {item.items
                  .filter((line) => line.comment)
                  .map((line) => `${line.name}: ${line.comment}`)
                  .join('; ')}
              </p>
            )}
            <p>{formatMoney(item.total)} · {item.status} {item.reservationId ? `· бронь #${item.reservationId}` : ''}</p>
          </div>
          {!readOnly && (
            <div className="admin-actions">
              {['confirmed', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => (
                <button key={status} type="button" onClick={() => api.patchOrderStatus(item.id, status).then(load)}>
                  {status}
                </button>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminMenuPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const load = () => api.getAdminMenu().then((res) => setItems(res.items)).catch(() => {
    if (readOnly) api.getMenu().then((res) => setItems(res.categories.flatMap((c) => c.items)));
  });
  useEffect(() => { void load(); }, [readOnly]);
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>Меню</h1>
      {items.map((item) => (
        <article key={item.id} className="admin-row">
          <div>
            <strong>{item.name}</strong>
            <p>{formatMoney(item.price)} · {item.isAvailable ? 'в меню' : 'скрыто'}</p>
          </div>
          {!readOnly && (
            <button type="button" onClick={() => api.patchMenuItem(item.id, { isAvailable: !item.isAvailable }).then(load)}>
              {item.isAvailable ? 'Скрыть' : 'Показать'}
            </button>
          )}
        </article>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminGuestsPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<GuestProfile[]>([]);
  useEffect(() => {
    (readOnly ? api.getDemoGuests() : api.getAdminGuests()).then(setItems);
  }, [readOnly]);
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>Гости</h1>
      {items.map((item) => (
        <Link key={item.id} to={`${readOnly ? '/demo/admin' : '/admin'}/guests/${item.id}`} className="admin-row">
          <div>
            <strong>{item.name}</strong>
            <p>{item.visits} визитов · {formatMoney(item.totalSpend)} · {item.loyaltyBalance} бонусов</p>
          </div>
        </Link>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminGuestPage({ readOnly = false }: { readOnly?: boolean }) {
  const navigate = useNavigate();
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const [item, setItem] = useState<GuestProfile | null>(null);
  useEffect(() => {
    (readOnly ? api.getDemoGuest(id) : api.getAdminGuest(id)).then(setItem);
  }, [id, readOnly]);
  if (!item) return <div className="admin-shell">Загрузка…</div>;
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Назад</button>
      <h1>{item.name}</h1>
      <p>Telegram {item.telegramUserId}</p>
      <p>Визиты {item.visits} · заказы {item.orders} · {formatMoney(item.totalSpend)} · средний {formatMoney(item.averageCheck)}</p>
      <p>Последний визит {item.lastVisit || '—'} · бонусы {item.loyaltyBalance}</p>
      <p>Любимое: {item.favoriteItems.map((fav) => fav.name).join(', ') || '—'}</p>
      {item.staffNotes && <p>Staff notes: {item.staffNotes}</p>}
      {item.timeline?.map((event) => (
        <p key={`${event.kind}-${event.id}`}>
          {event.at.slice(0, 10)} · {event.kind} · {event.title} {event.amount ? formatMoney(event.amount) : ''}
        </p>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}

export function AdminLoyaltyPage({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<Array<{ guest: { id: number; name: string }; balance: number }>>([]);
  const load = () => (readOnly ? api.getDemoLoyalty() : api.getAdminLoyalty()).then(setItems);
  useEffect(() => { void load(); }, [readOnly]);
  const inner = (
    <div className="admin-shell">
      <AdminNav readOnly={readOnly} />
      <h1>Лояльность</h1>
      {items.map((item) => (
        <article key={item.guest.id} className="admin-row">
          <div>
            <strong>{item.guest.name}</strong>
            <p>{item.balance} бонусов</p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                const amount = Number(prompt('Сумма корректировки (можно минус)', '50'));
                const note = prompt('Комментарий', 'Корректировка администратора') || 'adjustment';
                if (!Number.isFinite(amount) || !amount) return;
                void api.adjustLoyalty(item.guest.id, amount, note).then(load);
              }}
            >
              Adjust
            </button>
          )}
        </article>
      ))}
    </div>
  );
  return readOnly ? inner : <AdminGate>{inner}</AdminGate>;
}
