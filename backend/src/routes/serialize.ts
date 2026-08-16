import type {
  DiningArea,
  Guest,
  GuestPreference,
  GuestProfile,
  Location,
  MenuCategory,
  MenuItem,
  Order,
  ReservationDetails,
  Restaurant,
  Table,
  WaitlistEntry,
} from '../types.js';

export function serializeRestaurant(restaurant: Restaurant, location: Location, areas: DiningArea[]) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    location: {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      timezone: location.timezone,
      openingTime: location.openingTime,
      closingTime: location.closingTime,
    },
    diningAreas: areas.map((area) => ({
      id: area.id,
      name: area.name,
      slug: area.slug,
      description: area.description,
    })),
  };
}

export function serializeMenuItem(item: MenuItem) {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    isAvailable: item.isAvailable,
    prepTimeMinutes: item.prepTimeMinutes,
    tags: item.tags,
    allergens: item.allergens,
    modifierGroups: item.modifierGroups.map((group) => ({
      id: group.id,
      name: group.name,
      required: group.required,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      modifiers: group.modifiers
        .filter((modifier) => modifier.isActive)
        .map((modifier) => ({
          id: modifier.id,
          name: modifier.name,
          priceDelta: modifier.priceDelta,
        })),
    })),
  };
}

export function serializeMenu(categories: MenuCategory[], items: MenuItem[]) {
  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      items: items.filter((item) => item.categoryId === category.id).map(serializeMenuItem),
    })),
    allergenDisclaimer:
      'Информация об аллергенах справочная. Если у вас есть аллергия, уточните состав у сотрудников ресторана — мы не даём медицинских гарантий.',
  };
}

export function serializeOrder(order: Order) {
  return {
    id: order.id,
    number: order.number,
    type: order.type,
    status: order.status,
    reservationId: order.reservationId,
    tableId: order.tableId,
    pickupAt: order.pickupAt,
    comment: order.comment,
    subtotal: order.subtotal,
    total: order.total,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      comment: item.comment,
      modifiers: item.modifiers.map((modifier) => ({
        name: modifier.name,
        priceDelta: modifier.priceDelta,
      })),
    })),
  };
}

export function serializeReservationPublic(reservation: ReservationDetails) {
  return {
    id: reservation.id,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    partySize: reservation.partySize,
    status: reservation.status,
    occasion: reservation.occasion,
    wishes: reservation.wishes,
    diningArea: reservation.diningArea
      ? { id: reservation.diningArea.id, name: reservation.diningArea.name }
      : null,
    tableAssigned: Boolean(reservation.assignedTableId || reservation.assignedCombinationId),
    preorder: reservation.preorder ? serializeOrder(reservation.preorder) : null,
    createdAt: reservation.createdAt,
  };
}

export function serializeReservationAdmin(reservation: ReservationDetails) {
  return {
    ...serializeReservationPublic(reservation),
    guest: {
      id: reservation.guest.id,
      name: reservation.guest.name,
      phone: reservation.guest.phone,
      telegramUserId: reservation.guest.telegramUserId,
    },
    table: reservation.assignedTable
      ? { id: reservation.assignedTable.id, code: reservation.assignedTable.code }
      : null,
    combination: reservation.assignedCombination
      ? { id: reservation.assignedCombination.id, name: reservation.assignedCombination.name }
      : null,
    history: reservation.history,
  };
}

export function serializeGuestPublic(guest: Guest, preferences: GuestPreference) {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    telegramUserId: guest.telegramUserId,
    preferences: {
      preferredDiningAreaId: preferences.preferredDiningAreaId,
      dietaryPreferences: preferences.dietaryPreferences,
      notes: preferences.notes,
    },
  };
}

export function serializeGuestProfile(profile: GuestProfile, includeStaffNotes = false) {
  return {
    ...serializeGuestPublic(profile.guest, profile.preferences),
    loyaltyBalance: profile.loyaltyBalance,
    visits: profile.visits,
    reservations: profile.reservations,
    orders: profile.orders,
    totalSpend: profile.totalSpend,
    averageCheck: profile.averageCheck,
    lastVisit: profile.lastVisit,
    favoriteItems: profile.favoriteItems,
    nextReservation: profile.nextReservation
      ? serializeReservationPublic(profile.nextReservation)
      : null,
    recentOrders: profile.recentOrders.map(serializeOrder),
    ...(includeStaffNotes ? { staffNotes: profile.preferences.staffNotes } : {}),
  };
}

export function serializeWaitlist(entry: WaitlistEntry) {
  return {
    id: entry.id,
    date: entry.date,
    preferredTime: entry.preferredTime,
    partySize: entry.partySize,
    diningAreaId: entry.diningAreaId,
    status: entry.status,
    createdAt: entry.createdAt,
  };
}

export function serializeTable(table: Table, areaName: string, current?: ReservationDetails | null, next?: ReservationDetails | null) {
  return {
    id: table.id,
    code: table.code,
    name: table.name,
    minCapacity: table.minCapacity,
    maxCapacity: table.maxCapacity,
    diningAreaId: table.diningAreaId,
    diningAreaName: areaName,
    isActive: table.isActive,
    currentReservation: current
      ? {
          id: current.id,
          time: current.startTime,
          guest: current.guest.name,
          partySize: current.partySize,
          status: current.status,
        }
      : null,
    nextReservation: next
      ? { id: next.id, time: next.startTime, guest: next.guest.name, partySize: next.partySize }
      : null,
    occupancy: current ? current.startTime : 'FREE',
  };
}
