import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import { formatDate } from '../lib/format';
import type { GuestProfile, RestaurantInfo } from '../types';
import { OCCASION_LABELS } from '../types';
import { RepeatIntoCart } from './OrderPage';
import { Loading } from '../components/Chrome';

export function HomePage() {
  const { user } = useApp();
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMe(), api.getRestaurant()])
      .then(([me, info]) => {
        setProfile(me);
        setRestaurant(info);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  const returning = Boolean(profile && (profile.visits > 0 || profile.orders > 0 || profile.nextReservation));

  return (
    <div className="page home-page">
      <p className="eyebrow">{restaurant?.location.city} · {restaurant?.location.name}</p>
      <h1 className="brand" data-demo-tour="home-hero">
        Nord Bistro
      </h1>
      <p className="lead">
        {returning
          ? `Добро пожаловать обратно, ${profile?.name.split(' ')[0] || user.firstName}`
          : restaurant?.description}
      </p>

      {returning && profile && (
        <section className="home-returning" data-demo-tour="returning-home">
          {profile.nextReservation && (
            <article className="highlight-card">
              <p className="eyebrow">Следующая бронь</p>
              <h2>
                {formatDate(profile.nextReservation.date)} · {profile.nextReservation.startTime}
              </h2>
              <p>
                {profile.nextReservation.partySize} гостя · {profile.nextReservation.diningArea?.name} ·{' '}
                {OCCASION_LABELS[profile.nextReservation.occasion]}
              </p>
            </article>
          )}
          <div className="stat-row">
            <div>
              <strong>{profile.loyaltyBalance}</strong>
              <span>бонусов</span>
            </div>
            {profile.favoriteItems[0] && (
              <div>
                <strong>{profile.favoriteItems[0].name}</strong>
                <span>любимое</span>
              </div>
            )}
          </div>
          {profile.recentOrders[0] && (
            <div className="last-order">
              <p className="eyebrow">Ваш прошлый заказ</p>
              <p>{profile.recentOrders[0].items.map((item) => item.name).join(' · ')}</p>
              <RepeatIntoCart orderId={profile.recentOrders[0].id}>Повторить заказ</RepeatIntoCart>
            </div>
          )}
        </section>
      )}

      <div className="home-actions" data-demo-tour="home-actions">
        <Link className="btn btn-primary btn-block" to="/reserve" data-demo-tour="reserve-cta">
          Забронировать стол
        </Link>
        <Link className="btn btn-secondary btn-block" to="/order">
          Заказать с собой
        </Link>
        <Link className="btn btn-ghost btn-block" to="/menu">
          Меню
        </Link>
      </div>
    </div>
  );
}
