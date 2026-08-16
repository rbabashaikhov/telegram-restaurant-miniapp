import { config } from '../config.js';
import { addMinutesToTime, listStartTimes } from '../domain/availability.js';
import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type {
  AvailabilitySlot,
  CartLineInput,
  ReservationDetails,
  ReservationWishes,
  VisitOccasion,
} from '../types.js';

export function listAvailability(
  data: Providers,
  params: {
    locationId: number;
    date: string;
    partySize: number;
    diningAreaId?: number | null;
    now?: Date;
  },
): AvailabilitySlot[] {
  const location = data.restaurant.getLocation(params.locationId);
  const times = listStartTimes({
    openingTime: location.openingTime || config.restaurant.openingTime,
    closingTime: location.closingTime || config.restaurant.closingTime,
    durationMinutes: config.restaurant.durationMinutes,
    stepMinutes: config.restaurant.slotStepMinutes,
  });
  const now = params.now ?? new Date();

  return times.map((time) => {
    if (isPast(params.date, time, now)) {
      return { time, available: false, assignment: null };
    }
    const assignment = data.availability.assign({
      locationId: params.locationId,
      date: params.date,
      startTime: time,
      partySize: params.partySize,
      durationMinutes: config.restaurant.durationMinutes,
      bufferMinutes: config.restaurant.bufferMinutes,
      diningAreaId: params.diningAreaId,
    });
    return { time, available: Boolean(assignment), assignment };
  });
}

function isPast(date: string, time: string, now: Date): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const slot = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return slot.getTime() <= now.getTime();
}

export function createReservation(
  data: Providers,
  params: {
    guestTelegram: { id: number; first_name?: string; last_name?: string; username?: string };
    locationId: number;
    date: string;
    startTime: string;
    partySize: number;
    diningAreaId?: number | null;
    occasion: VisitOccasion;
    wishes?: ReservationWishes;
    preorder?: CartLineInput[];
    comment?: string | null;
    idempotencyKey?: string;
    name?: string;
    phone?: string;
  },
): ReservationDetails {
  if (params.idempotencyKey) {
    const existing = data.idempotency.get(params.idempotencyKey, 'reservation.create');
    if (existing) {
      const reservation = data.reservations.getById(existing.resourceId);
      if (reservation) return reservation;
    }
  }

  if (params.partySize < 1 || params.partySize > 16) {
    throw new AppError('Party size is out of range', 400, 'VALIDATION_ERROR');
  }

  return data.transaction(() => {
    const { guest, created } = data.guests.upsert(params.guestTelegram, {
      name: params.name,
      phone: params.phone,
    });
    if (created) {
      data.events.publish('guest.created', { guestId: guest.id });
    }

    const assignment = data.availability.assign({
      locationId: params.locationId,
      date: params.date,
      startTime: params.startTime,
      partySize: params.partySize,
      durationMinutes: config.restaurant.durationMinutes,
      bufferMinutes: config.restaurant.bufferMinutes,
      diningAreaId: params.diningAreaId,
    });

    if (!assignment) {
      throw new AppError(
        'Selected slot is no longer available',
        409,
        'RESERVATION_SLOT_UNAVAILABLE',
      );
    }

    const reservation = data.reservations.create({
      locationId: params.locationId,
      guestId: guest.id,
      diningAreaId: assignment.diningAreaId,
      assignedTableId: assignment.tableId,
      assignedCombinationId: assignment.combinationId,
      date: params.date,
      startTime: params.startTime,
      endTime: addMinutesToTime(params.startTime, config.restaurant.durationMinutes),
      partySize: params.partySize,
      status: 'pending',
      occasion: params.occasion,
      wishes: params.wishes ?? {},
    });

    if (params.idempotencyKey) {
      data.idempotency.put({
        key: params.idempotencyKey,
        scope: 'reservation.create',
        resourceType: 'reservation',
        resourceId: reservation.id,
      });
    }

    data.events.publish('reservation.created', {
      reservationId: reservation.id,
      guestId: guest.id,
      date: params.date,
      startTime: params.startTime,
      partySize: params.partySize,
      occasion: params.occasion,
    });

    return data.reservations.getById(reservation.id)!;
  });
}

export function cancelReservation(data: Providers, reservationId: number, guestId?: number): ReservationDetails {
  const reservation = data.reservations.getById(reservationId);
  if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
  if (guestId && reservation.guestId !== guestId) {
    throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
  }
  if (reservation.status === 'cancelled') return reservation;
  if (reservation.status === 'completed' || reservation.status === 'seated') {
    throw new AppError('Reservation cannot be cancelled', 409, 'RESERVATION_NOT_CANCELLABLE');
  }
  const updated = data.reservations.updateStatus(reservationId, 'cancelled', 'Отменена гостем или рестораном');
  data.events.publish('reservation.cancelled', { reservationId });
  return updated;
}

export function rescheduleReservation(
  data: Providers,
  params: {
    reservationId: number;
    date: string;
    startTime: string;
    partySize?: number;
    diningAreaId?: number | null;
    guestId?: number;
  },
): ReservationDetails {
  return data.transaction(() => {
    const reservation = data.reservations.getById(params.reservationId);
    if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
    if (params.guestId && reservation.guestId !== params.guestId) {
      throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
    }
    if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
      throw new AppError('Reservation cannot be rescheduled', 409, 'RESERVATION_NOT_RESCHEDULABLE');
    }
    const partySize = params.partySize ?? reservation.partySize;
    const assignment = data.availability.assign({
      locationId: reservation.locationId,
      date: params.date,
      startTime: params.startTime,
      partySize,
      durationMinutes: config.restaurant.durationMinutes,
      bufferMinutes: config.restaurant.bufferMinutes,
      diningAreaId: params.diningAreaId ?? reservation.diningAreaId,
      ignoreReservationId: reservation.id,
    });
    if (!assignment) {
      throw new AppError('Selected slot is no longer available', 409, 'RESERVATION_SLOT_UNAVAILABLE');
    }
    const updated = data.reservations.reschedule(reservation.id, {
      date: params.date,
      startTime: params.startTime,
      endTime: addMinutesToTime(params.startTime, config.restaurant.durationMinutes),
      diningAreaId: assignment.diningAreaId,
      assignedTableId: assignment.tableId,
      assignedCombinationId: assignment.combinationId,
      partySize,
    });
    data.events.publish('reservation.rescheduled', { reservationId: reservation.id });
    return updated;
  });
}

export function changeReservationStatus(
  data: Providers,
  reservationId: number,
  status: ReservationDetails['status'],
): ReservationDetails {
  const reservation = data.reservations.getById(reservationId);
  if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
  const updated = data.reservations.updateStatus(reservationId, status);
  if (status === 'confirmed') data.events.publish('reservation.confirmed', { reservationId });
  if (status === 'no_show') data.events.publish('reservation.no_show', { reservationId });
  if (status === 'seated') data.events.publish('reservation.seated', { reservationId });
  if (status === 'completed') data.events.publish('reservation.completed', { reservationId });
  if (status === 'cancelled') data.events.publish('reservation.cancelled', { reservationId });
  return updated;
}
