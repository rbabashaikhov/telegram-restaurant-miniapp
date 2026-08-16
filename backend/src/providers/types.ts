import type {
  BusinessEvent,
  CartLineInput,
  DiningArea,
  Guest,
  GuestPreference,
  IdempotencyRecord,
  Location,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTxType,
  MenuCategory,
  MenuItem,
  OccupancyInterval,
  Order,
  OrderStatus,
  OrderType,
  OutboundEventName,
  Reservation,
  ReservationDetails,
  ReservationHistoryEntry,
  ReservationStatus,
  ReservationWishes,
  Restaurant,
  Table,
  TableAssignment,
  TableBlock,
  TableCombination,
  TelegramUser,
  VisitOccasion,
  WaitlistEntry,
  WaitlistStatus,
} from '../types.js';

export interface RestaurantProvider {
  getRestaurant(): Restaurant;
  getLocation(id?: number): Location;
  listLocations(): Location[];
  listDiningAreas(locationId: number): DiningArea[];
  getDiningArea(id: number): DiningArea | undefined;
}

export interface TableProvider {
  listTables(locationId: number): Table[];
  getTable(id: number): Table | undefined;
  getTableByCode(locationId: number, code: string): Table | undefined;
  listCombinations(locationId: number): TableCombination[];
  getCombination(id: number): TableCombination | undefined;
  listBlocks(locationId: number, date: string): TableBlock[];
  createBlock(params: Omit<TableBlock, 'id'>): TableBlock;
}

export interface MenuProvider {
  listCategories(locationId: number): MenuCategory[];
  getCategory(id: number): MenuCategory | undefined;
  createCategory(params: Omit<MenuCategory, 'id'>): MenuCategory;
  updateCategory(id: number, patch: Partial<Omit<MenuCategory, 'id'>>): MenuCategory;
  listItems(locationId: number, options?: { availableOnly?: boolean }): MenuItem[];
  getItem(id: number): MenuItem | undefined;
  createItem(params: Omit<MenuItem, 'id' | 'modifierGroups'> & { modifierGroups?: MenuItem['modifierGroups'] }): MenuItem;
  updateItem(id: number, patch: Partial<Omit<MenuItem, 'id' | 'modifierGroups'>>): MenuItem;
  setItemAvailability(id: number, isAvailable: boolean): MenuItem;
}

export interface GuestProvider {
  upsert(user: TelegramUser, extras?: { name?: string; phone?: string }): { guest: Guest; created: boolean };
  getById(id: number): Guest | undefined;
  getByTelegramUserId(telegramUserId: number): Guest | undefined;
  listAll(): Guest[];
  update(id: number, patch: Partial<Pick<Guest, 'name' | 'phone'>>): Guest;
  getPreferences(guestId: number): GuestPreference;
  updatePreferences(guestId: number, patch: Partial<GuestPreference>): GuestPreference;
}

export interface ReservationProvider {
  create(params: {
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
  }): Reservation;
  getById(id: number): ReservationDetails | undefined;
  listByGuest(guestId: number): ReservationDetails[];
  list(filters: {
    locationId?: number;
    date?: string;
    status?: ReservationStatus;
  }): ReservationDetails[];
  updateStatus(id: number, status: ReservationStatus, note?: string): ReservationDetails;
  reschedule(
    id: number,
    patch: {
      date: string;
      startTime: string;
      endTime: string;
      diningAreaId: number | null;
      assignedTableId: number | null;
      assignedCombinationId: number | null;
      partySize?: number;
    },
  ): ReservationDetails;
  listOccupancy(locationId: number, date: string): OccupancyInterval[];
  addHistory(params: Omit<ReservationHistoryEntry, 'id' | 'createdAt'>): void;
}

export interface AvailabilityPort {
  assign(params: {
    locationId: number;
    date: string;
    startTime: string;
    partySize: number;
    durationMinutes: number;
    bufferMinutes: number;
    diningAreaId?: number | null;
    ignoreReservationId?: number;
  }): TableAssignment | null;
}

export interface OrderProvider {
  nextNumber(): string;
  create(params: {
    guestId: number;
    locationId: number;
    reservationId: number | null;
    tableId: number | null;
    type: OrderType;
    status: OrderStatus;
    pickupAt: string | null;
    comment: string | null;
    items: Array<{
      menuItemId: number;
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      comment: string | null;
      modifiers: Array<{ modifierId: number; name: string; priceDelta: number }>;
    }>;
    subtotal: number;
    total: number;
  }): Order;
  getById(id: number): Order | undefined;
  listByGuest(guestId: number): Order[];
  list(filters?: { locationId?: number; status?: OrderStatus; type?: OrderType; date?: string }): Order[];
  updateStatus(id: number, status: OrderStatus): Order;
  getByReservationId(reservationId: number): Order | undefined;
}

export interface LoyaltyProvider {
  getOrCreateAccount(guestId: number): LoyaltyAccount;
  getAccountByGuest(guestId: number): LoyaltyAccount | undefined;
  listTransactions(accountId: number): LoyaltyTransaction[];
  addTransaction(params: {
    accountId: number;
    type: LoyaltyTxType;
    amount: number;
    orderId: number | null;
    note: string | null;
    idempotencyKey: string | null;
  }): LoyaltyTransaction;
  findByIdempotencyKey(key: string): LoyaltyTransaction | undefined;
  findEarnForOrder(orderId: number): LoyaltyTransaction | undefined;
  balance(accountId: number): number;
}

export interface WaitlistProvider {
  create(params: {
    guestId: number;
    locationId: number;
    date: string;
    preferredTime: string;
    partySize: number;
    diningAreaId: number | null;
  }): WaitlistEntry;
  getById(id: number): WaitlistEntry | undefined;
  list(filters?: { locationId?: number; date?: string; status?: WaitlistStatus }): WaitlistEntry[];
  listByGuest(guestId: number): WaitlistEntry[];
  updateStatus(
    id: number,
    status: WaitlistStatus,
    extra?: { offeredReservationId?: number | null },
  ): WaitlistEntry;
}

export interface PaymentProvider {
  createIntent(params: { orderId: number; amount: number }): { id: string; status: 'mock' };
}

export interface POSProvider {
  submitOrder(order: Order): { accepted: boolean; externalId: string | null };
}

export interface EventProvider {
  publish(name: OutboundEventName, payload: Record<string, unknown>): BusinessEvent;
  list(limit?: number): BusinessEvent[];
}

export interface IdempotencyProvider {
  get(key: string, scope: string): IdempotencyRecord | undefined;
  put(record: Omit<IdempotencyRecord, 'createdAt'>): IdempotencyRecord;
}

export interface Providers {
  restaurant: RestaurantProvider;
  tables: TableProvider;
  menu: MenuProvider;
  guests: GuestProvider;
  reservations: ReservationProvider;
  availability: AvailabilityPort;
  orders: OrderProvider;
  loyalty: LoyaltyProvider;
  waitlist: WaitlistProvider;
  payments: PaymentProvider;
  pos: POSProvider;
  events: EventProvider;
  idempotency: IdempotencyProvider;
  transaction<T>(fn: () => T): T;
}
