import { describe, expect, it } from 'vitest';
import type { Table, TableCombination } from '../types.js';
import {
  buildCandidates,
  intervalsOverlap,
  listStartTimes,
  selectAssignment,
  timeToMinutes,
} from './availability.js';

const tables: Table[] = [
  {
    id: 1,
    locationId: 1,
    diningAreaId: 1,
    code: 'T1',
    name: 'T1',
    minCapacity: 1,
    maxCapacity: 2,
    isActive: true,
  },
  {
    id: 2,
    locationId: 1,
    diningAreaId: 1,
    code: 'T2',
    name: 'T2',
    minCapacity: 1,
    maxCapacity: 2,
    isActive: true,
  },
  {
    id: 3,
    locationId: 1,
    diningAreaId: 1,
    code: 'T3',
    name: 'T3',
    minCapacity: 3,
    maxCapacity: 4,
    isActive: true,
  },
  {
    id: 4,
    locationId: 1,
    diningAreaId: 1,
    code: 'T4',
    name: 'T4',
    minCapacity: 3,
    maxCapacity: 4,
    isActive: true,
  },
  {
    id: 5,
    locationId: 1,
    diningAreaId: 1,
    code: 'T5',
    name: 'T5',
    minCapacity: 5,
    maxCapacity: 6,
    isActive: true,
  },
  {
    id: 10,
    locationId: 1,
    diningAreaId: 2,
    code: 'T10',
    name: 'T10',
    minCapacity: 2,
    maxCapacity: 4,
    isActive: true,
  },
];

const combinations: TableCombination[] = [
  {
    id: 1,
    locationId: 1,
    diningAreaId: 1,
    name: 'T4+T5',
    minCapacity: 7,
    maxCapacity: 8,
    isActive: true,
    tableIds: [4, 5],
  },
];

describe('availability domain', () => {
  it('detects overlapping intervals', () => {
    expect(intervalsOverlap(19 * 60, 21 * 60, 20 * 60, 22 * 60)).toBe(true);
    expect(intervalsOverlap(19 * 60, 21 * 60, 21 * 60, 23 * 60)).toBe(false);
  });

  it('prefers a single best-fit table over a combination', () => {
    const assignment = selectAssignment({
      tables,
      combinations,
      occupancy: [],
      blocks: [],
      partySize: 4,
      startTime: '19:00',
      durationMinutes: 120,
      bufferMinutes: 15,
    });
    expect(assignment?.kind).toBe('table');
    expect(assignment?.label).toBe('T3');
  });

  it('uses a table combination when party exceeds single tables', () => {
    const assignment = selectAssignment({
      tables,
      combinations,
      occupancy: [],
      blocks: [],
      partySize: 8,
      startTime: '19:00',
      durationMinutes: 120,
      bufferMinutes: 15,
    });
    expect(assignment?.kind).toBe('combination');
    expect(assignment?.label).toBe('T4+T5');
    expect(assignment?.tableIds).toEqual([4, 5]);
  });

  it('returns no table when party cannot be seated', () => {
    const assignment = selectAssignment({
      tables,
      combinations,
      occupancy: [],
      blocks: [],
      partySize: 12,
      startTime: '19:00',
      durationMinutes: 120,
      bufferMinutes: 15,
    });
    expect(assignment).toBeNull();
  });

  it('respects dining area filter', () => {
    const assignment = selectAssignment({
      tables,
      combinations,
      occupancy: [],
      blocks: [],
      partySize: 2,
      startTime: '19:00',
      durationMinutes: 120,
      bufferMinutes: 15,
      diningAreaId: 2,
    });
    expect(assignment?.label).toBe('T10');
  });

  it('blocks overlapping reservations including buffer', () => {
    const assignment = selectAssignment({
      tables,
      combinations,
      occupancy: [
        {
          tableIds: [3],
          startTime: '19:00',
          endTime: '21:00',
          reservationId: 1,
        },
      ],
      blocks: [],
      partySize: 4,
      startTime: '21:00',
      durationMinutes: 120,
      bufferMinutes: 15,
    });
    expect(assignment?.label).toBe('T4');

    const tooClose = selectAssignment({
      tables: tables.filter((table) => table.id === 3),
      combinations: [],
      occupancy: [
        {
          tableIds: [3],
          startTime: '19:00',
          endTime: '21:00',
          reservationId: 1,
        },
      ],
      blocks: [],
      partySize: 4,
      startTime: '21:00',
      durationMinutes: 120,
      bufferMinutes: 15,
    });
    expect(tooClose).toBeNull();
  });

  it('lists start times from opening hours and duration', () => {
    const slots = listStartTimes({
      openingTime: '12:00',
      closingTime: '16:00',
      durationMinutes: 120,
      stepMinutes: 30,
    });
    expect(slots[0]).toBe('12:00');
    expect(slots.at(-1)).toBe('14:00');
    expect(timeToMinutes('14:00') + 120).toBe(timeToMinutes('16:00'));
  });

  it('does not offer a two-top for a party of four unless combined', () => {
    const twoTops = buildCandidates({
      tables: tables.filter((table) => table.maxCapacity === 2),
      combinations: [],
      partySize: 4,
    });
    expect(twoTops).toHaveLength(0);
  });
});
