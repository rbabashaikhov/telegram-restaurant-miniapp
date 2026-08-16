export interface AppConfig {
  businessName: string;
  businessType: string;
  businessVertical: string;
  appTitle: string;
  appDescription: string;
  timezone: string;
  demoMode: boolean;
  adminProtected: boolean;
  currency: string;
  currencySymbol: string;
  branding: { accent: string; logoUrl: string | null };
  restaurant: {
    durationMinutes: number;
    bufferMinutes: number;
    slotStepMinutes: number;
    openingTime: string;
    closingTime: string;
    loyaltyEarnPercent: number;
  };
  features: { demoTour: boolean; demoAdminPreview: boolean };
}

export interface DiningArea {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface RestaurantInfo {
  id: number;
  name: string;
  description: string;
  location: {
    id: number;
    name: string;
    address: string;
    city: string;
    timezone: string;
    openingTime: string;
    closingTime: string;
  };
  diningAreas: DiningArea[];
}

export interface Modifier {
  id: number;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
  prepTimeMinutes: number;
  tags: string[];
  allergens: string[];
  modifierGroups: ModifierGroup[];
}

export interface MenuCategory {
  id: number;
  name: string;
  slug: string;
  items: MenuItem[];
}

export interface MenuPayload {
  categories: MenuCategory[];
  allergenDisclaimer: string;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  assignment: { label: string; kind: string } | null;
}

export interface OrderItem {
  id: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  comment: string | null;
  modifiers: Array<{ name: string; priceDelta: number }>;
}

export interface Order {
  id: number;
  number: string;
  type: string;
  status: string;
  reservationId: number | null;
  tableId: number | null;
  pickupAt: string | null;
  comment: string | null;
  subtotal: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
  guest?: { id: number; name: string };
}

export interface Reservation {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  status: string;
  occasion: string;
  wishes: {
    highChair?: boolean;
    birthday?: boolean;
    quietTable?: boolean;
    stroller?: boolean;
    comment?: string;
  };
  diningArea: { id: number; name: string } | null;
  tableAssigned: boolean;
  preorder: Order | null;
  createdAt: string;
  guest?: { id: number; name: string; phone: string | null };
  table?: { id: number; code: string } | null;
  combination?: { id: number; name: string } | null;
}

export interface GuestProfile {
  id: number;
  name: string;
  phone: string | null;
  telegramUserId: number;
  preferences: {
    preferredDiningAreaId: number | null;
    dietaryPreferences: string[];
    notes: string | null;
  };
  loyaltyBalance: number;
  visits: number;
  reservations: number;
  orders: number;
  totalSpend: number;
  averageCheck: number;
  lastVisit: string | null;
  favoriteItems: Array<{ menuItemId: number; name: string; image: string; count: number }>;
  nextReservation: Reservation | null;
  recentOrders: Order[];
  staffNotes?: string | null;
  timeline?: Array<{ at: string; kind: string; title: string; amount: number | null; status: string; id: number }>;
}

export interface WaitlistEntry {
  id: number;
  date: string;
  preferredTime: string;
  partySize: number;
  diningAreaId: number | null;
  status: string;
  createdAt: string;
  guest?: { id: number; name: string };
}

export interface TablePlanItem {
  id: number;
  code: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  diningAreaId: number;
  diningAreaName: string;
  occupancy: string;
  currentReservation: { id: number; time: string; guest: string; partySize: number; status: string } | null;
  nextReservation: { id: number; time: string; guest: string; partySize: number } | null;
}

export interface DashboardKpis {
  reservationsToday: number;
  guestsToday: number;
  ordersToday: number;
  preorderRevenue: number;
  averageOrder: number;
  waitlistWaiting: number;
  returningGuests: number;
  noShowCount: number;
  noShowRate: number | null;
  completedOrders: number;
}

export interface CartLineInput {
  menuItemId: number;
  quantity: number;
  modifierIds: number[];
  comment?: string | null;
}

export const OCCASION_LABELS: Record<string, string> = {
  casual: 'Просто поужинать',
  date: 'Свидание',
  family: 'Семейный ужин',
  business: 'Деловая встреча',
  birthday: 'День рождения',
  celebration: 'Праздник',
};

export const INTENT_CHIPS: Array<{ id: string; label: string }> = [
  { id: 'light', label: 'Что-нибудь лёгкое' },
  { id: 'hearty', label: 'Сытно' },
  { id: 'no_meat', label: 'Без мяса' },
  { id: 'spicy', label: 'Острое' },
  { id: 'kids', label: 'Для ребёнка' },
  { id: 'fast', label: 'Быстро' },
];

export const TAG_LABELS: Record<string, string> = {
  vegetarian: 'Вегетарианское',
  vegan: 'Веган',
  gluten_free: 'Без глютена',
  spicy: 'Острое',
  kids: 'Детское',
  popular: 'Хит',
};

export const ALLERGEN_LABELS: Record<string, string> = {
  nuts: 'орехи',
  milk: 'молоко',
  gluten: 'глютен',
  eggs: 'яйца',
  fish: 'рыба',
  shellfish: 'моллюски',
  soy: 'соя',
  sesame: 'кунжут',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  seated: 'Гости за столом',
  completed: 'Завершена',
  cancelled: 'Отменена',
  no_show: 'Не пришли',
  draft: 'Черновик',
  submitted: 'Отправлен',
  preparing: 'Готовим',
  ready: 'Готов',
  waiting: 'В листе',
  offered: 'Предложили слот',
  accepted: 'Принят',
  expired: 'Истёк',
  dine_in: 'В зале',
  takeaway: 'Самовывоз',
  delivery: 'Доставка',
  reservation_preorder: 'Предзаказ',
};
