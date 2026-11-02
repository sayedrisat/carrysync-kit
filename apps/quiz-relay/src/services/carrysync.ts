import { createClient, InMemoryEventStore } from '@carrysync/core';

// Real SDK adapter, session-only storage. Persist the device ID with IndexedDB later.
export const carrysync = createClient('quiz-relay', new InMemoryEventStore(), crypto.randomUUID());
