import {
  CarrySyncError, deserializePayload, mergeEvents, payloadByteLength,
  type ApplicationId, type SyncEvent,
} from '@carrysync/core';

export interface ImportPreview {
  app: ApplicationId;
  bytes: number;
  eventCount: number;
  newEvents: SyncEvent[];
  duplicateEvents: SyncEvent[];
  conflicts: { eventId: string }[];
  /** False when any conflict exists: the real import would reject the whole batch. */
  canImport: boolean;
}

/**
 * Read-only dry run against a snapshot of the current accepted set. It never writes.
 * Advisory only: `client.importPayload` revalidates everything inside its transaction, so a store
 * that changed after preview can still reject the batch.
 * Throws the same CarrySyncError codes as import for invalid, oversized or wrong-app payloads.
 */
export function previewImport(app: ApplicationId, current: readonly SyncEvent[], payload: string): ImportPreview {
  const envelope = deserializePayload(payload, app);
  const existing = new Map(mergeEvents(app, [], current).events.map((event) => [event.id, event]));
  const newEvents: SyncEvent[] = [];
  const duplicateEvents: SyncEvent[] = [];
  const conflicts: { eventId: string }[] = [];
  for (const event of envelope.events) {
    const local = existing.get(event.id);
    if (!local) { newEvents.push(event); continue; }
    try {
      mergeEvents(app, [local], [event]);
      duplicateEvents.push(event);
    } catch (error) {
      if (error instanceof CarrySyncError && error.code === 'CONFLICTING_EVENT') conflicts.push({ eventId: event.id });
      else throw error;
    }
  }
  return {
    app, bytes: payloadByteLength(payload), eventCount: envelope.events.length,
    newEvents, duplicateEvents, conflicts, canImport: conflicts.length === 0,
  };
}
