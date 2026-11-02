import type { CarrySyncClient, EventInput, SyncEvent } from '@carrysync/core';

// Optional UI prototype only. Export/import is intentionally absent; use the real adapter for QR.
export function createMockEventService(): Pick<CarrySyncClient<'quiz-relay'>, 'createEvent' | 'listEvents'> {
  const events: SyncEvent[] = [];
  return {
    async createEvent(input: EventInput<'quiz-relay'>) {
      const event: SyncEvent = { ...input, app: 'quiz-relay', id: crypto.randomUUID(), deviceId: '00000000-0000-4000-8000-000000000001', createdAt: new Date().toISOString() };
      events.push(structuredClone(event));
      return event;
    },
    async listEvents() { return structuredClone(events); },
  };
}
