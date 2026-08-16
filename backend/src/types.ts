export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthContext {
  telegramUser: TelegramUser;
  isDemo: boolean;
}

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  'pending',
  'confirmed',
  'seated',
];

export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery', 'reservation_preorder'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  'draft',
  'submitted',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const WAITLIST_STATUSES = ['waiting', 'offered', 'accepted', 'expired', 'cancelled'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const VISIT_OCCASIONS = [
  'casual',
  'date',
  'family',
  'business',
  'birthday',
  'celebration',
] as const;
export type VisitOccasion = (typeof VISIT_OCCASIONS)[number];

export const LOYALTY_TX_TYPES = ['earned', 'redeemed', 'adjustment'] as const;
export type LoyaltyTxType = (typeof LOYALTY_TX_TYPES)[number];

export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'spicy',
  'kids',
  'popular',
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const ALLERGENS = ['nuts', 'milk', 'gluten', 'eggs', 'fish', 'shellfish', 'soy', 'sesame'] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const MENU_INTENTS = ['light', 'hearty', 'no_meat', 'spicy', 'kids', 'fast'] as const;
export type MenuIntent = (typeof MENU_INTENTS)[number];

export const OUTBOUND_EVENTS = [
  'reservation.created',
  'reservation.cancelled',
  'reservation.confirmed',
  'reservation.no_show',
  'reservation.seated',
  'reservation.completed',
  'reservation.rescheduled',
  'order.created',
  'order.confirmed',
  'order.ready',
  'order.completed',
  'order.cancelled',
  'guest.created',
  'guest.returned',
  'waitlist.created',
  'waitlist.offered',
  'waitlist.accepted',
  'waitlist.cancelled',
  'table.call_waiter',
  'table.request_bill',
  'loyalty.earned',
  'loyalty.redeemed',
  'loyalty.adjusted',
] as const;
export type OutboundEventName = (typeof OUTBOUND_EVENTS)[number];

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

export interface Location {
  id: number;
  restaurantId: number;
  name: string;
  address: string;
  city: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  isActive: boolean;
}

export interface DiningArea {
  id: number;
  locationId: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

export interface Table {
  id: number;
  locationId: number;
  diningAreaId: number;
  code: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  isActive: boolean;
}

export interface TableCombination {
  id: number;
  locationId: number;
  diningAreaId: number;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  isActive: boolean;
  tableIds: number[];
}

export interface TableBlock {
  id: number;
  tableId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface Guest {
  id: number;
  telegramUserId: number;
  name: string;
  phone: string | null;
  username: string | null;
  createdAt: string;
}

export interface GuestPreference {
  guestId: number;
  preferredDiningAreaId: number | null;
  dietaryPreferences: DietaryTag[];
  notes: string | null;
  staffNotes: string | null;
}

export interface MenuCategory {
  id: number;
  locationId: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Modifier {
  id: number;
  groupId: number;
  name: string;
  priceDelta: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: number;
  menuItemId: number;
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
  tags: DietaryTag[];
  allergens: Allergen[];
  sortOrder: number;
  modifierGroups: ModifierGroup[];
}

export interface ReservationWishes {
  highChair?: boolean;
  birthday?: boolean;
  quietTable?: boolean;
  stroller?: boolean;
  comment?: string;
}

export interface Reservation {
  id: number;
  locationId: number;
  guestId: number;
  diningAreaId: number | null;
  assignedTableId: number | null;
  assignedCombinationId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  status: ReservationStatus;
  occasion: VisitOccasion;
  wishes: ReservationWishes;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationHistoryEntry {
  id: number;
  reservationId: number;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  note: string | null;
  createdAt: string;
}

export interface ReservationDetails extends Reservation {
  guest: Guest;
  diningArea: DiningArea | null;
  assignedTable: Table | null;
  assignedCombination: TableCombination | null;
  preorder: Order | null;
  history: ReservationHistoryEntry[];
}

export interface OrderItemModifier {
  id: number;
  orderItemId: number;
  modifierId: number;
  name: string;
  priceDelta: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  comment: string | null;
  modifiers: OrderItemModifier[];
}

export interface Order {
  id: number;
  number: string;
  guestId: number;
  locationId: number;
  reservationId: number | null;
  tableId: number | null;
  type: OrderType;
  status: OrderStatus;
  pickupAt: string | null;
  comment: string | null;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface LoyaltyAccount {
  id: number;
  guestId: number;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: number;
  accountId: number;
  type: LoyaltyTxType;
  amount: number;
  orderId: number | null;
  note: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface WaitlistEntry {
  id: number;
  guestId: number;
  locationId: number;
  date: string;
  preferredTime: string;
  partySize: number;
  diningAreaId: number | null;
  status: WaitlistStatus;
  offeredReservationId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessEvent {
  id: number;
  name: OutboundEventName;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface TableAssignment {
  kind: 'table' | 'combination';
  tableId: number | null;
  combinationId: number | null;
  tableIds: number[];
  diningAreaId: number;
  label: string;
  capacity: { min: number; max: number };
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  assignment: TableAssignment | null;
}

export interface OccupancyInterval {
  tableIds: number[];
  startTime: string;
  endTime: string;
  reservationId: number;
}

export interface CartLineInput {
  menuItemId: number;
  quantity: number;
  modifierIds: number[];
  comment?: string | null;
}

export interface RepeatOrderResult {
  items: CartLineInput[];
  skipped: Array<{ menuItemId: number; name: string; reason: string }>;
}

export interface GuestProfile {
  guest: Guest;
  preferences: GuestPreference;
  loyaltyBalance: number;
  visits: number;
  reservations: number;
  orders: number;
  totalSpend: number;
  averageCheck: number;
  lastVisit: string | null;
  favoriteItems: Array<{ menuItemId: number; name: string; image: string; count: number }>;
  nextReservation: ReservationDetails | null;
  recentOrders: Order[];
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

export interface IdempotencyRecord {
  key: string;
  scope: string;
  resourceType: string;
  resourceId: number;
  createdAt: string;
}
