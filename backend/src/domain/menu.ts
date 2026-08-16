import type { DietaryTag, MenuIntent, MenuItem } from '../types.js';

export function itemMatchesIntent(item: MenuItem, intent: MenuIntent): boolean {
  if (!item.isAvailable) return false;
  switch (intent) {
    case 'light':
      return item.tags.includes('vegetarian') || item.prepTimeMinutes <= 15;
    case 'hearty':
      return item.tags.includes('popular') || item.price >= 900;
    case 'no_meat':
      return item.tags.includes('vegetarian') || item.tags.includes('vegan');
    case 'spicy':
      return item.tags.includes('spicy');
    case 'kids':
      return item.tags.includes('kids');
    case 'fast':
      return item.prepTimeMinutes <= 15;
    default:
      return true;
  }
}

export function filterMenuByIntent(items: MenuItem[], intent: MenuIntent): MenuItem[] {
  return items.filter((item) => itemMatchesIntent(item, intent));
}

export function filterMenuByDiet(items: MenuItem[], diets: DietaryTag[]): MenuItem[] {
  if (diets.length === 0) return items;
  return items.filter((item) => diets.every((tag) => item.tags.includes(tag)));
}

export interface DinnerForTwoPick {
  items: MenuItem[];
  total: number;
}

export function assembleDinnerForTwo(items: MenuItem[], budget: number): DinnerForTwoPick | null {
  const available = items.filter((item) => item.isAvailable);
  const starters = available.filter((item) => item.price <= 800 && item.prepTimeMinutes <= 20);
  const mains = available.filter((item) => item.price >= 700);
  const drinks = available.filter((item) => item.prepTimeMinutes <= 10 && item.price <= 650);

  const starter = starters[0];
  const starterTwo = starters[1] ?? starters[0];
  const main = mains.find((item) => item.tags.includes('popular')) ?? mains[0];
  const mainTwo = mains.find((item) => item.id !== main?.id && item.price <= (main?.price ?? 0) + 200) ?? main;
  const drink = drinks[0];
  const drinkTwo = drinks[1] ?? drinks[0];

  if (!starter || !main || !drink) return null;

  const picked = [starter, starterTwo, main, mainTwo, drink, drinkTwo].filter(Boolean) as MenuItem[];
  const unique: MenuItem[] = [];
  const seen = new Set<number>();
  for (const item of picked) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }

  let total = unique.reduce((sum, item) => sum + item.price, 0);
  while (unique.length > 2 && total > budget) {
    unique.pop();
    total = unique.reduce((sum, item) => sum + item.price, 0);
  }
  if (total > budget || unique.length < 2) return null;
  return { items: unique, total };
}
