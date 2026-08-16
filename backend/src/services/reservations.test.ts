import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createReservation, cancelReservation, rescheduleReservation, changeReservationStatus, listAvailability } from '../services/reservations.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

const FUTURE = '2030-05-16';

describe('reservations', () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => {
    world.db.close();
  });

  it('assigns an available table for a fitting party', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: world.user,
      locationId: 1,
      date: FUTURE,
      startTime: '19:00',
      partySize: 2,
      occasion: 'casual',
    });
    expect(reservation.status).toBe('pending');
    expect(reservation.assignedTableId).toBeTruthy();
  });

  it('returns no table when party exceeds capacity', () => {
    expect(() =>
      createReservation(world.providers, {
        guestTelegram: world.user,
        locationId: 1,
        date: FUTURE,
        startTime: '19:00',
        partySize: 16,
        occasion: 'celebration',
      }),
    ).toThrow(AppError);
    try {
      createReservation(world.providers, {
        guestTelegram: { id: 42, first_name: 'Huge' },
        locationId: 1,
        date: FUTURE,
        startTime: '19:00',
        partySize: 16,
        occasion: 'celebration',
      });
    } catch (error) {
      expect((error as AppError).code).toBe('RESERVATION_SLOT_UNAVAILABLE');
    }
  });

  it('does not seat a party of four at a two-top', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: { id: 77, first_name: 'Four' },
      locationId: 1,
      date: FUTURE,
      startTime: '18:00',
      partySize: 4,
      diningAreaId: 1,
      occasion: 'family',
    });
    const table = world.providers.tables.getTable(reservation.assignedTableId!);
    expect(table?.maxCapacity).toBeGreaterThanOrEqual(4);
  });

  it('rejects overlapping reservations on the same table', () => {
    createReservation(world.providers, {
      guestTelegram: { id: 11, first_name: 'First' },
      locationId: 1,
      date: FUTURE,
      startTime: '19:00',
      partySize: 6,
      diningAreaId: 3,
      occasion: 'casual',
    });
    expect(() =>
      createReservation(world.providers, {
        guestTelegram: { id: 12, first_name: 'Second' },
        locationId: 1,
        date: FUTURE,
        startTime: '19:00',
        partySize: 6,
        diningAreaId: 3,
        occasion: 'casual',
      }),
    ).toThrow(/no longer available/);
  });

  it('keeps a requested dining area', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: { id: 21, first_name: 'Terrace' },
      locationId: 1,
      date: FUTURE,
      startTime: '19:00',
      partySize: 2,
      diningAreaId: 2,
      occasion: 'date',
    });
    expect(reservation.diningAreaId).toBe(2);
    expect(reservation.assignedTable?.diningAreaId).toBe(2);
  });

  it('assigns a table combination for eight guests', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: { id: 31, first_name: 'Party' },
      locationId: 1,
      date: FUTURE,
      startTime: '18:00',
      partySize: 8,
      diningAreaId: 1,
      occasion: 'celebration',
    });
    expect(reservation.assignedCombinationId).toBeTruthy();
    expect(reservation.assignedCombination?.tableIds.length).toBeGreaterThan(1);
  });

  it('releases availability after cancel', () => {
    const first = createReservation(world.providers, {
      guestTelegram: { id: 41, first_name: 'Cancel' },
      locationId: 1,
      date: FUTURE,
      startTime: '15:00',
      partySize: 6,
      diningAreaId: 3,
      occasion: 'casual',
    });
    cancelReservation(world.providers, first.id);
    const second = createReservation(world.providers, {
      guestTelegram: { id: 42, first_name: 'Next' },
      locationId: 1,
      date: FUTURE,
      startTime: '15:00',
      partySize: 6,
      diningAreaId: 3,
      occasion: 'casual',
    });
    expect(second.id).not.toBe(first.id);
  });

  it('reschedules onto a free slot', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: { id: 51, first_name: 'Move' },
      locationId: 1,
      date: FUTURE,
      startTime: '16:00',
      partySize: 2,
      occasion: 'casual',
    });
    const moved = rescheduleReservation(world.providers, {
      reservationId: reservation.id,
      date: FUTURE,
      startTime: '17:00',
    });
    expect(moved.startTime).toBe('17:00');
  });

  it('marks no-show without keeping the table occupied', () => {
    const reservation = createReservation(world.providers, {
      guestTelegram: { id: 61, first_name: 'Ghost' },
      locationId: 1,
      date: FUTURE,
      startTime: '14:00',
      partySize: 6,
      diningAreaId: 3,
      occasion: 'casual',
    });
    changeReservationStatus(world.providers, reservation.id, 'confirmed');
    changeReservationStatus(world.providers, reservation.id, 'no_show');
    const again = createReservation(world.providers, {
      guestTelegram: { id: 62, first_name: 'New' },
      locationId: 1,
      date: FUTURE,
      startTime: '14:00',
      partySize: 6,
      diningAreaId: 3,
      occasion: 'casual',
    });
    expect(again.assignedTableId).toBeTruthy();
  });

  it('protects concurrent booking of the last matching table', () => {
    const first = createReservation(world.providers, {
      guestTelegram: { id: 71, first_name: 'A' },
      locationId: 1,
      date: FUTURE,
      startTime: '13:00',
      partySize: 6,
      diningAreaId: 3,
      occasion: 'casual',
    });
    let failed = false;
    try {
      createReservation(world.providers, {
        guestTelegram: { id: 72, first_name: 'B' },
        locationId: 1,
        date: FUTURE,
        startTime: '13:00',
        partySize: 6,
        diningAreaId: 3,
        occasion: 'casual',
      });
    } catch (error) {
      failed = error instanceof AppError && error.code === 'RESERVATION_SLOT_UNAVAILABLE';
    }
    expect(first.id).toBeTruthy();
    expect(failed).toBe(true);
  });

  it('is idempotent on create', () => {
    const params = {
      guestTelegram: { id: 81, first_name: 'Idem' },
      locationId: 1,
      date: FUTURE,
      startTime: '12:30',
      partySize: 2,
      occasion: 'casual' as const,
      idempotencyKey: 'res-1',
    };
    const a = createReservation(world.providers, params);
    const b = createReservation(world.providers, params);
    expect(a.id).toBe(b.id);
  });

  it('lists computed availability slots', () => {
    const slots = listAvailability(world.providers, {
      locationId: 1,
      date: FUTURE,
      partySize: 2,
      diningAreaId: 2,
      now: new Date('2026-08-16T10:00:00'),
    });
    expect(slots.some((slot) => slot.time === '19:00' && slot.available)).toBe(true);
  });
});
