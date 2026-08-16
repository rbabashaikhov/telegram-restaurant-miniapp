export function formatMoney(amount: number, symbol = '₽'): string {
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function formatDateShort(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function weekdayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', { weekday: 'long' });
}

export function nextFriday(from = new Date()): string {
  const date = new Date(from);
  const delta = (5 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function upcomingDates(count = 10): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    dates.push(toIsoDate(date));
  }
  return dates;
}
