import type {
  OccupancyInterval,
  Table,
  TableAssignment,
  TableBlock,
  TableCombination,
} from '../types.js';

export function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function addMinutesToTime(hhmm: string, minutes: number): string {
  return minutesToTime(timeToMinutes(hhmm) + minutes);
}

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function withBuffer(endMinutes: number, bufferMinutes: number): number {
  return endMinutes + bufferMinutes;
}

export interface CandidateSeat {
  assignment: TableAssignment;
  waste: number;
}

export function buildCandidates(params: {
  tables: Table[];
  combinations: TableCombination[];
  partySize: number;
  diningAreaId?: number | null;
}): CandidateSeat[] {
  const tables = params.tables.filter(
    (table) =>
      table.isActive &&
      (params.diningAreaId == null || table.diningAreaId === params.diningAreaId),
  );
  const combinations = params.combinations.filter(
    (combo) =>
      combo.isActive &&
      (params.diningAreaId == null || combo.diningAreaId === params.diningAreaId),
  );

  const candidates: CandidateSeat[] = [];

  for (const table of tables) {
    if (params.partySize < table.minCapacity || params.partySize > table.maxCapacity) continue;
    candidates.push({
      waste: table.maxCapacity - params.partySize,
      assignment: {
        kind: 'table',
        tableId: table.id,
        combinationId: null,
        tableIds: [table.id],
        diningAreaId: table.diningAreaId,
        label: table.code,
        capacity: { min: table.minCapacity, max: table.maxCapacity },
      },
    });
  }

  for (const combo of combinations) {
    if (params.partySize < combo.minCapacity || params.partySize > combo.maxCapacity) continue;
    const comboTables = tables.filter((table) => combo.tableIds.includes(table.id));
    if (comboTables.length !== combo.tableIds.length) continue;
    candidates.push({
      waste: combo.maxCapacity - params.partySize,
      assignment: {
        kind: 'combination',
        tableId: null,
        combinationId: combo.id,
        tableIds: [...combo.tableIds],
        diningAreaId: combo.diningAreaId,
        label: combo.name,
        capacity: { min: combo.minCapacity, max: combo.maxCapacity },
      },
    });
  }

  return candidates.sort((a, b) => {
    if (a.waste !== b.waste) return a.waste - b.waste;
    if (a.assignment.kind !== b.assignment.kind) {
      return a.assignment.kind === 'table' ? -1 : 1;
    }
    const left = a.assignment.tableId ?? a.assignment.combinationId ?? 0;
    const right = b.assignment.tableId ?? b.assignment.combinationId ?? 0;
    return left - right;
  });
}

export function tableIdsConflict(
  left: number[],
  right: number[],
): boolean {
  const set = new Set(left);
  return right.some((id) => set.has(id));
}

export function isOccupied(params: {
  tableIds: number[];
  startMinutes: number;
  endMinutes: number;
  bufferMinutes: number;
  occupancy: OccupancyInterval[];
  ignoreReservationId?: number;
}): boolean {
  const newEnd = withBuffer(params.endMinutes, params.bufferMinutes);
  return params.occupancy.some((interval) => {
    if (params.ignoreReservationId && interval.reservationId === params.ignoreReservationId) {
      return false;
    }
    if (!tableIdsConflict(params.tableIds, interval.tableIds)) return false;
    const existingStart = timeToMinutes(interval.startTime);
    const existingEnd = withBuffer(timeToMinutes(interval.endTime), params.bufferMinutes);
    return intervalsOverlap(params.startMinutes, newEnd, existingStart, existingEnd);
  });
}

export function isBlocked(params: {
  tableIds: number[];
  startMinutes: number;
  endMinutes: number;
  blocks: TableBlock[];
}): boolean {
  return params.blocks.some((block) => {
    if (!params.tableIds.includes(block.tableId)) return false;
    return intervalsOverlap(
      params.startMinutes,
      params.endMinutes,
      timeToMinutes(block.startTime),
      timeToMinutes(block.endTime),
    );
  });
}

export function selectAssignment(params: {
  tables: Table[];
  combinations: TableCombination[];
  occupancy: OccupancyInterval[];
  blocks: TableBlock[];
  partySize: number;
  startTime: string;
  durationMinutes: number;
  bufferMinutes: number;
  diningAreaId?: number | null;
  ignoreReservationId?: number;
}): TableAssignment | null {
  const startMinutes = timeToMinutes(params.startTime);
  const endMinutes = startMinutes + params.durationMinutes;
  const candidates = buildCandidates({
    tables: params.tables,
    combinations: params.combinations,
    partySize: params.partySize,
    diningAreaId: params.diningAreaId,
  });

  for (const candidate of candidates) {
    if (
      isBlocked({
        tableIds: candidate.assignment.tableIds,
        startMinutes,
        endMinutes,
        blocks: params.blocks,
      })
    ) {
      continue;
    }
    if (
      isOccupied({
        tableIds: candidate.assignment.tableIds,
        startMinutes,
        endMinutes,
        bufferMinutes: params.bufferMinutes,
        occupancy: params.occupancy,
        ignoreReservationId: params.ignoreReservationId,
      })
    ) {
      continue;
    }
    return candidate.assignment;
  }

  return null;
}

export function listStartTimes(params: {
  openingTime: string;
  closingTime: string;
  durationMinutes: number;
  stepMinutes: number;
}): string[] {
  const start = timeToMinutes(params.openingTime);
  const lastStart = timeToMinutes(params.closingTime) - params.durationMinutes;
  const times: string[] = [];
  for (let cursor = start; cursor <= lastStart; cursor += params.stepMinutes) {
    times.push(minutesToTime(cursor));
  }
  return times;
}

export function isPastSlot(date: string, time: string, now: Date, timezoneOffsetMinutes?: number): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const slot = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (timezoneOffsetMinutes != null) {
    void timezoneOffsetMinutes;
  }
  return slot.getTime() <= now.getTime();
}
