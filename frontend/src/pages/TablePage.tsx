import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { Loading, TopBar } from '../components/Chrome';

export function TablePage() {
  const [params] = useSearchParams();
  const code = (params.get('table') || 'T12').toUpperCase();
  const cart = useCart();
  const [info, setInfo] = useState<{ table: { code: string; name: string }; area: { name: string }; location: { name: string } } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.tableContext(code).then(setInfo).catch(() => setInfo(null));
    cart.setPurpose('dine_in');
  }, [code]);

  if (!info) return <Loading />;

  return (
    <div className="page">
      <TopBar title={`Стол ${info.table.code}`} />
      <p className="eyebrow">{info.location.name} · {info.area.name}</p>
      <h1>Стол {info.table.code}</h1>
      <p className="lead">Вы уже за столом. Можно смотреть меню, заказать, позвать официанта или попросить счёт.</p>
      <div className="home-actions">
        <Link className="btn btn-primary btn-block" to="/menu">Меню</Link>
        <Link className="btn btn-secondary btn-block" to="/order">Сделать заказ</Link>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={async () => {
            await api.callWaiter(info.table.code);
            setMessage('Официант уже идёт');
          }}
        >
          Позвать официанта
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={async () => {
            await api.requestBill(info.table.code);
            setMessage('Счёт уже готовят');
          }}
        >
          Попросить счёт
        </button>
      </div>
      {message && <p className="lead">{message}</p>}
    </div>
  );
}
