import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type { WaitlistEntry } from '../types.js';

export function joinWaitlist(
  data: Providers,
  params: {
    guestTelegram: { id: number; first_name?: string; last_name?: string; username?: string };
    locationId: number;
    date: string;
    preferredTime: string;
    partySize: number;
    diningAreaId?: number | null;
    name?: string;
    phone?: string;
  },
): WaitlistEntry {
  const { guest, created } = data.guests.upsert(params.guestTelegram, {
    name: params.name,
    phone: params.phone,
  });
  if (created) data.events.publish('guest.created', { guestId: guest.id });
  const entry = data.waitlist.create({
    guestId: guest.id,
    locationId: params.locationId,
    date: params.date,
    preferredTime: params.preferredTime,
    partySize: params.partySize,
    diningAreaId: params.diningAreaId ?? null,
  });
  data.events.publish('waitlist.created', { waitlistId: entry.id, guestId: guest.id });
  return entry;
}

export function offerWaitlist(data: Providers, id: number): WaitlistEntry {
  const entry = data.waitlist.getById(id);
  if (!entry) throw new AppError('Waitlist entry not found', 404, 'WAITLIST_NOT_FOUND');
  if (entry.status !== 'waiting') {
    throw new AppError('Waitlist entry cannot be offered', 409, 'WAITLIST_INVALID_STATUS');
  }
  const updated = data.waitlist.updateStatus(id, 'offered');
  data.events.publish('waitlist.offered', { waitlistId: id });
  return updated;
}

export function acceptWaitlist(data: Providers, id: number, guestId?: number): WaitlistEntry {
  const entry = data.waitlist.getById(id);
  if (!entry) throw new AppError('Waitlist entry not found', 404, 'WAITLIST_NOT_FOUND');
  if (guestId && entry.guestId !== guestId) {
    throw new AppError('Waitlist entry not found', 404, 'WAITLIST_NOT_FOUND');
  }
  if (entry.status !== 'offered') {
    throw new AppError('Offer is no longer available', 409, 'WAITLIST_INVALID_STATUS');
  }
  const updated = data.waitlist.updateStatus(id, 'accepted');
  data.events.publish('waitlist.accepted', { waitlistId: id });
  return updated;
}

export function cancelWaitlist(data: Providers, id: number, guestId?: number): WaitlistEntry {
  const entry = data.waitlist.getById(id);
  if (!entry) throw new AppError('Waitlist entry not found', 404, 'WAITLIST_NOT_FOUND');
  if (guestId && entry.guestId !== guestId) {
    throw new AppError('Waitlist entry not found', 404, 'WAITLIST_NOT_FOUND');
  }
  const updated = data.waitlist.updateStatus(id, 'cancelled');
  data.events.publish('waitlist.cancelled', { waitlistId: id });
  return updated;
}
