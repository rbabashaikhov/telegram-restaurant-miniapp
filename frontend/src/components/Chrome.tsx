import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTableSession } from '../context/TableContext';

export function BottomNav() {
  const location = useLocation();
  const cart = useCart();
  const table = useTableSession();
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/demo')) return null;

  const items = table.code
    ? [
        { to: `/table?table=${table.code}`, label: 'Стол' },
        { to: '/menu', label: 'Меню' },
        { to: '/cart', label: cart.count ? `Корзина · ${cart.count}` : 'Корзина' },
      ]
    : [
        { to: '/', label: 'Главная' },
        { to: '/reserve', label: 'Бронь' },
        { to: '/order', label: 'Заказ' },
        { to: '/profile', label: 'Я' },
      ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={location.pathname === item.to.split('?')[0] ? 'active' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function TopBar({ title, back }: { title: string; back?: string }) {
  return (
    <div className="topbar">
      {back ? (
        <Link to={back} className="back-link" aria-label="Назад">
          ←
        </Link>
      ) : (
        <span />
      )}
      <h1>{title}</h1>
      <span />
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill status-${status}`}>{status.replace('_', ' ')}</span>;
}

export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="error-banner">
      <span>{error}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}
