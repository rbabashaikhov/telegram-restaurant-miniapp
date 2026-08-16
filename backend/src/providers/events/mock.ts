import type { EventProvider } from '../types.js';

export function createMockEventPublisher(): EventProvider {
  return {
    publish(name, payload) {
      return {
        id: 0,
        name,
        payload,
        createdAt: new Date().toISOString(),
      };
    },
    list() {
      return [];
    },
  };
}
