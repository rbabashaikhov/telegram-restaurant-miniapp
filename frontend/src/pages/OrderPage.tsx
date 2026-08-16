import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useReservationDraft } from '../context/ReservationContext';
import { useTableSession } from '../context/TableContext';
import { formatMoney } from '../lib/format';
import { addLine } from '../lib/cart';
import { ErrorBanner, TopBar } from '../components/Chrome';

export function OrderPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const table = useTableSession();

  useEffect(() => {
    cart.setPurpose(table.code ? 'dine_in' : 'takeaway');
  }, [table.code]);

  return (
    <div className="page">
      <TopBar title={table.code ? `Заказ за ${table.code}` : 'Самовывоз'} back="/" />
      <p className="lead">
        {table.code
          ? 'Соберите заказ, и кухня начнёт готовить к вашему столу.'
          : 'Соберите заказ и заберите сами. Время готовности посчитаем по блюдам.'}
      </p>
      <Link className="btn btn-primary btn-block" to="/menu">
        Открыть меню
      </Link>
      {cart.count > 0 && (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate('/cart')}>
          Корзина · {cart.count} · {formatMoney(cart.total)}
        </button>
      )}
    </div>
  );
}

export function CartPage() {
  const cart = useCart();
  const table = useTableSession();
  const navigate = useNavigate();
  const { draft } = useReservationDraft();
  const [estimate, setEstimate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cart.lines.length || cart.purpose !== 'takeaway') return;
    api.estimatePickup(cart.payload).then((res) => setEstimate(res.label)).catch(() => setEstimate(''));
  }, [cart.lines, cart.payload, cart.purpose]);

  if (!cart.lines.length) {
    return (
      <div className="page">
        <TopBar title="Корзина" back="/order" />
        <div className="empty">
          <h3>Корзина пуста</h3>
          <p>Добавьте блюда из меню — можно повторить прошлый заказ в профиле.</p>
          <Link className="btn btn-primary" to="/menu">Меню</Link>
        </div>
      </div>
    );
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      if (cart.purpose === 'preorder') {
        navigate('/reserve');
        return;
      }
      const order = await api.createOrder({
        type: table.code ? 'dine_in' : 'takeaway',
        items: cart.payload,
        tableCode: table.code || undefined,
      });
      cart.clear();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось оформить заказ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <TopBar title="Корзина" back={cart.purpose === 'preorder' ? '/reserve' : '/order'} />
      {cart.lines.map((line) => (
        <article key={line.key} className="cart-line">
          <img src={line.image} alt="" />
          <div>
            <h3>{line.name}</h3>
            {line.modifierLabels.length > 0 && <p>{line.modifierLabels.join(', ')}</p>}
            <strong>{formatMoney(line.unitPrice * line.quantity)}</strong>
            <div className="qty">
              <button type="button" onClick={() => cart.change(line.key, -1)}>−</button>
              <span>{line.quantity}</span>
              <button type="button" onClick={() => cart.change(line.key, 1)}>+</button>
            </div>
          </div>
        </article>
      ))}
      {estimate && <p className="lead">{estimate}</p>}
      {draft.withPreorder && cart.purpose === 'preorder' && (
        <p className="lead">Это предзаказ к брони {draft.startTime}.</p>
      )}
      <h2>Итого {formatMoney(cart.total)}</h2>
      {error && <ErrorBanner error={error} />}
      <button type="button" className="btn btn-primary btn-block" disabled={submitting} onClick={() => void submit()}>
        {cart.purpose === 'preorder' ? 'Вернуться к брони' : submitting ? 'Отправляем…' : 'Оформить заказ'}
      </button>
    </div>
  );
}

export function RepeatIntoCart({ orderId, children }: { orderId: number; children: string }) {
  const cart = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await api.repeatOrder(orderId);
        const menu = await api.getMenu();
        const items = menu.categories.flatMap((category) => category.items);
        let lines = [] as ReturnType<typeof addLine>;
        for (const line of result.items) {
          const item = items.find((entry) => entry.id === line.menuItemId);
          if (!item) continue;
          for (let i = 0; i < line.quantity; i += 1) {
            lines = addLine(lines, item, line.modifierIds, line.comment || undefined);
          }
        }
        cart.replace(lines);
        cart.setPurpose('takeaway');
        navigate('/cart');
      }}
    >
      {children}
    </button>
  );
}
