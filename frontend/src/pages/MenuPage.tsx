import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { DishCard } from '../components/DishCard';
import { ErrorBanner, Loading, TopBar } from '../components/Chrome';
import { useCart } from '../context/CartContext';
import { ALLERGEN_LABELS, INTENT_CHIPS, TAG_LABELS, type MenuItem, type MenuPayload } from '../types';
import { formatMoney } from '../lib/format';

export function MenuPage() {
  const [search] = useSearchParams();
  const fromReserve = search.get('from') === 'reserve';
  const [intent, setIntent] = useState<string>('');
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState(4500);

  useEffect(() => {
    api.getMenu(intent || undefined).then(setMenu).catch((err) => setError(err.message));
  }, [intent]);

  if (!menu) return error ? <ErrorBanner error={error} /> : <Loading />;

  return (
    <div className="page">
      <TopBar title="Меню" back={fromReserve ? '/reserve' : '/'} />
      <section data-demo-tour="menu-intents">
        <p className="eyebrow">Что хочется?</p>
        <div className="chip-row">
          <button type="button" className={!intent ? 'chip active' : 'chip'} onClick={() => setIntent('')}>
            Всё меню
          </button>
          {INTENT_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={intent === chip.id ? 'chip active' : 'chip'}
              onClick={() => setIntent(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>
      <details className="dinner-box">
        <summary>Собрать ужин на двоих</summary>
        <label>
          Бюджет, ₽
          <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </label>
        <DinnerForTwo budget={budget} />
      </details>
      {menu.categories.map((category) =>
        category.items.length ? (
          <section key={category.id}>
            <h2>{category.name}</h2>
            <div className="dish-list">
              {category.items.map((item) => (
                <DishCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null,
      )}
      <p className="disclaimer">{menu.allergenDisclaimer}</p>
      {fromReserve && (
        <Link className="btn btn-primary btn-block sticky-cta" to="/reserve">
          Вернуться к брони
        </Link>
      )}
    </div>
  );
}

function DinnerForTwo({ budget }: { budget: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    api.getDinnerForTwo(budget).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    }).catch(() => setItems([]));
  }, [budget]);
  if (!items.length) return <p>Не удалось уложиться в бюджет — попробуйте увеличить сумму.</p>;
  return (
    <div>
      {items.map((item) => (
        <p key={item.id}>{item.name} · {formatMoney(item.price)}</p>
      ))}
      <strong>Итого {formatMoney(total)}</strong>
    </div>
  );
}

export function MenuItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMenuItem(Number(id)).then((data) => {
      setItem(data);
      const required = data.modifierGroups.filter((group) => group.required).flatMap((group) => [group.modifiers[0]?.id]);
      setSelected(required.filter(Boolean));
    });
  }, [id]);

  if (!item) return <Loading />;

  function toggle(groupId: number, modifierId: number) {
    if (!item) return;
    const group = item.modifierGroups.find((entry) => entry.id === groupId);
    if (!group) return;
    const inGroup = group.modifiers.map((modifier) => modifier.id);
    const current = selected.filter((value) => inGroup.includes(value));
    if (group.maxSelect === 1) {
      setSelected([...selected.filter((value) => !inGroup.includes(value)), modifierId]);
      return;
    }
    if (current.includes(modifierId)) {
      setSelected(selected.filter((value) => value !== modifierId));
      return;
    }
    if (current.length >= group.maxSelect) return;
    setSelected([...selected, modifierId]);
  }

  return (
    <div className="page">
      <TopBar title={item.name} back="/menu" />
      <img className="hero-image" src={item.image} alt={item.name} />
      <p className="lead">{item.description}</p>
      <p className="dish-card-tags">
        {item.tags.map((tag) => (
          <span key={tag}>{TAG_LABELS[tag] || tag}</span>
        ))}
      </p>
      {item.allergens.length > 0 && (
        <p className="disclaimer">
          Может содержать: {item.allergens.map((itemAllergen) => ALLERGEN_LABELS[itemAllergen] || itemAllergen).join(', ')}.
          Информация справочная, не является медицинской гарантией.
        </p>
      )}
      {item.modifierGroups.map((group) => (
        <section key={group.id}>
          <h3>
            {group.name} {group.required ? '· обязательно' : ''}
          </h3>
          {group.modifiers.map((modifier) => (
            <button
              key={modifier.id}
              type="button"
              className={selected.includes(modifier.id) ? 'choice active' : 'choice'}
              onClick={() => toggle(group.id, modifier.id)}
            >
              {modifier.name}
              {modifier.priceDelta ? ` · +${formatMoney(modifier.priceDelta)}` : ''}
            </button>
          ))}
        </section>
      ))}
      <label>
        Пожелание к блюду
        <textarea
          placeholder="Например: без лука, соус отдельно"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      {error && <ErrorBanner error={error} />}
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!item.isAvailable}
        onClick={() => {
          const missing = item.modifierGroups.filter(
            (group) => group.required && !group.modifiers.some((modifier) => selected.includes(modifier.id)),
          );
          if (missing.length) {
            setError(`Выберите: ${missing.map((group) => group.name).join(', ')}`);
            return;
          }
          cart.add(item, selected, comment || undefined);
          navigate('/cart');
        }}
      >
        {item.isAvailable ? `В корзину · ${formatMoney(item.price)}` : 'Сейчас нет'}
      </button>
    </div>
  );
}
