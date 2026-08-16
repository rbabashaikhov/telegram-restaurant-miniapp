import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acceptWaitlist, cancelWaitlist, joinWaitlist, offerWaitlist } from './waitlist.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

describe('waitlist', () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => {
    world.db.close();
  });

  it('creates a waiting entry', () => {
    const entry = joinWaitlist(world.providers, {
      guestTelegram: { id: 601, first_name: 'Wait' },
      locationId: 1,
      date: '2030-05-16',
      preferredTime: '19:00',
      partySize: 4,
      diningAreaId: 2,
    });
    expect(entry.status).toBe('waiting');
  });

  it('offers and accepts an entry', () => {
    const entry = joinWaitlist(world.providers, {
      guestTelegram: { id: 602, first_name: 'Offer' },
      locationId: 1,
      date: '2030-05-16',
      preferredTime: '20:00',
      partySize: 2,
    });
    const offered = offerWaitlist(world.providers, entry.id);
    expect(offered.status).toBe('offered');
    const accepted = acceptWaitlist(world.providers, entry.id, offered.guestId);
    expect(accepted.status).toBe('accepted');
  });

  it('cancels an entry', () => {
    const entry = joinWaitlist(world.providers, {
      guestTelegram: { id: 603, first_name: 'Cancel' },
      locationId: 1,
      date: '2030-05-16',
      preferredTime: '21:00',
      partySize: 2,
    });
    const cancelled = cancelWaitlist(world.providers, entry.id, entry.guestId);
    expect(cancelled.status).toBe('cancelled');
  });
});
