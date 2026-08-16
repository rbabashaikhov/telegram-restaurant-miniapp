import { Link } from 'react-router-dom';
import type { MenuItem } from '../types';
import { formatMoney } from '../lib/format';
import { TAG_LABELS } from '../types';

export function DishCard({ item }: { item: MenuItem }) {
  return (
    <Link to={`/menu/${item.id}`} className="dish-card" data-demo-tour={item.id === 14 ? 'favorite-dish' : undefined}>
      <img src={item.image} alt={item.name} />
      <div>
        <div className="dish-card-tags">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{TAG_LABELS[tag] || tag}</span>
          ))}
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <strong>{formatMoney(item.price)}</strong>
        {!item.isAvailable && <em>Сейчас нет</em>}
      </div>
    </Link>
  );
}
