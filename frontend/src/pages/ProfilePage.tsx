import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { RepeatIntoCart } from './OrderPage';
import { Empty, Loading, TopBar } from '../components/Chrome';
import { formatDate, formatMoney } from '../lib/format';
import { OCCASION_LABELS, STATUS_LABELS, type GuestProfile, type Order, type Reservation } from '../types';

export function ProfilePage() {
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loyalty, setLoyalty] = useState<{ balance: number; transactions: Array<{ id: number; type: string; amount: number; note: string | null }> } | null>(null);

  useEffect(() => {
    api.getMe().then(setProfile);
    api.getLoyalty().then(setLoyalty);
  }, []);

  if (!profile) return <Loading />;

  return (
    <div className="page">
      <TopBar title="Мой ресторан" back="/" />
      <section className="home-returning" data-demo-tour="profile-hero">
        <p className="eyebrow">Nord Bistro</p>
        <h2>{profile.name}</h2>
        <div className="stat-row">
          <div>
            <strong>{loyalty?.balance ?? profile.loyaltyBalance}</strong>
            <span>бонусов</span>
          </div>
          <div>
            <strong>{profile.visits}</strong>
            <span>визитов</span>
          </div>
          <div>
            <strong>{formatMoney(profile.averageCheck)}</strong>
            <span>средний чек</span>
          </div>
        </div>
      </section>
      {profile.nextReservation && (
        <article className="summary-card">
          <p className="eyebrow">Следующая бронь</p>
          <p>
            {formatDate(profile.nextReservation.date)} · {profile.nextReservation.startTime} · {profile.nextReservation.partySize} гостя
          </p>
        </article>
      )}
      {profile.favoriteItems[0] && (
        <article className="summary-card" data-demo-tour="profile-favorite">
          <p className="eyebrow">Любимое</p>
          <h3>{profile.favoriteItems[0].name}</h3>
        </article>
      )}
      {profile.recentOrders[0] && (
        <article className="summary-card" data-demo-tour="profile-repeat">
          <p className="eyebrow">Последний заказ</p>
          <p>{profile.recentOrders[0].items.map((item) => item.name).join(', ')}</p>
          <RepeatIntoCart orderId={profile.recentOrders[0].id}>Повторить заказ</RepeatIntoCart>
        </article>
      )}
      <div className="home-actions">
        <Link className="btn btn-secondary btn-block" to="/reservations">Мои брони</Link>
        <Link className="btn btn-secondary btn-block" to="/orders">Мои заказы</Link>
      </div>
      {loyalty && (
        <section>
          <h3>История бонусов</h3>
          {loyalty.transactions.map((tx) => (
            <p key={tx.id}>
              {tx.type === 'earned' ? '+' : tx.amount > 0 ? '+' : ''}
              {tx.amount} · {tx.note || tx.type}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

export function ReservationsPage() {
  const [items, setItems] = useState<Reservation[] | null>(null);
  useEffect(() => {
    api.getMyReservations().then(setItems);
  }, []);
  if (!items) return <Loading />;
  if (!items.length) return <div className="page"><TopBar title="Мои брони" back="/profile" /><Empty title="Броней пока нет" text="Забронируйте стол на ужин — это займёт минуту." /></div>;
  return (
    <div className="page">
      <TopBar title="Мои брони" back="/profile" />
      {items.map((item) => (
        <Link key={item.id} to={`/reservations/${item.id}`} className="summary-card">
          <p>{formatDate(item.date)} · {item.startTime}</p>
          <p>{item.partySize} гостя · {item.diningArea?.name} · {OCCASION_LABELS[item.occasion]}</p>
          <span>{STATUS_LABELS[item.status] || item.status}</span>
        </Link>
      ))}
    </div>
  );
}

export function ReservationDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Reservation | null>(null);
  useEffect(() => {
    api.getMyReservations().then((list) => setItem(list.find((entry) => entry.id === Number(id)) || null));
  }, [id]);
  if (!item) return <Loading />;
  return (
    <div className="page">
      <TopBar title="Бронь" back="/reservations" />
      <article className="summary-card">
        <h2>{formatDate(item.date)} · {item.startTime}</h2>
        <p>{item.partySize} гостя · {item.diningArea?.name}</p>
        <p>{OCCASION_LABELS[item.occasion]} · {STATUS_LABELS[item.status]}</p>
        <p>Стол назначит ресторан. Мы не фиксируем номер стола в приложении гостя.</p>
        {item.preorder && (
          <div>
            <p className="eyebrow">Предзаказ</p>
            {item.preorder.items.map((line) => (
              <p key={line.id}>{line.name} ×{line.quantity}</p>
            ))}
            <strong>{formatMoney(item.preorder.total)}</strong>
          </div>
        )}
      </article>
      {['pending', 'confirmed'].includes(item.status) && (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => api.cancelReservation(item.id).then(setItem)}>
          Отменить
        </button>
      )}
    </div>
  );
}

export function OrdersPage() {
  const [items, setItems] = useState<Order[] | null>(null);
  useEffect(() => {
    api.getMyOrders().then(setItems);
  }, []);
  if (!items) return <Loading />;
  if (!items.length) return <div className="page"><TopBar title="Заказы" back="/profile" /><Empty title="Заказов пока нет" text="Соберите самовывоз или предзаказ к брони." /></div>;
  return (
    <div className="page">
      <TopBar title="Мои заказы" back="/profile" />
      {items.map((item) => (
        <article key={item.id} className="summary-card">
          <p>{item.number} · {STATUS_LABELS[item.status] || item.status}</p>
          <p>{item.items.map((line) => `${line.name} ×${line.quantity}`).join(', ')}</p>
          <strong>{formatMoney(item.total)}</strong>
          <RepeatIntoCart orderId={item.id}>Повторить заказ</RepeatIntoCart>
        </article>
      ))}
    </div>
  );
}

export function OrderDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Order | null>(null);
  useEffect(() => {
    api.getMyOrders().then((list) => setItem(list.find((entry) => entry.id === Number(id)) || null));
  }, [id]);
  if (!item) return <Loading />;
  return (
    <div className="page">
      <TopBar title={item.number} back="/orders" />
      <article className="summary-card">
        <p>{STATUS_LABELS[item.status]} · {STATUS_LABELS[item.type] || item.type}</p>
        {item.pickupAt && <p>Самовывоз: {new Date(item.pickupAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>}
        {item.items.map((line) => (
          <p key={line.id}>{line.name} ×{line.quantity} · {formatMoney(line.lineTotal)}</p>
        ))}
        <h3>{formatMoney(item.total)}</h3>
      </article>
      <RepeatIntoCart orderId={item.id}>Повторить</RepeatIntoCart>
    </div>
  );
}
