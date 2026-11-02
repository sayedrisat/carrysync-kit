import { createClient, InMemoryEventStore } from '@carrysync/core';

// Real SDK adapter, session-only storage. Persist the device ID with IndexedDB later.
export const carrysync = createClient('field-ledger', new InMemoryEventStore(), crypto.randomUUID());
