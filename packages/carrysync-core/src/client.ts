import { createEvent, type ApplicationId, type EventInput, type SyncEvent } from './events.js';
import { type ErrorCode, toCarrySyncError } from './errors.js';
import { mergeEvents } from './merge.js';
import { deserializePayload } from './protocol.js';
import { encodeQrPayload } from './qr.js';
import { type EventStore } from './storage.js';

export interface ImportResult { added: number; duplicates: number; total: number }
export type ImportStatus =
  | { state: 'idle' }
  | { state: 'success'; result: ImportResult }
  | { state: 'error'; code: ErrorCode; message: string };

export function createClient<A extends ApplicationId>(app: A, store: EventStore, deviceId: string) {
  let status: ImportStatus = { state: 'idle' };
  return {
    async createEvent(input: EventInput<A>): Promise<SyncEvent> {
      const event = createEvent(app, deviceId, input);
      try { await store.update(app, (current) => mergeEvents(app, current, [event]).events); }
      catch (error) { throw toCarrySyncError(error); }
      return event;
    },
    async listEvents(): Promise<SyncEvent[]> {
      try { return await store.list(app); }
      catch (error) { throw toCarrySyncError(error); }
    },
    async prepareExport(events: readonly SyncEvent[]) { return encodeQrPayload(app, events); },
    async importPayload(payload: string): Promise<ImportResult> {
      try {
        // Fully parse and validate before entering the transaction.
        const envelope = deserializePayload(payload, app);
        let result: ImportResult = { added: 0, duplicates: 0, total: 0 };
        await store.update(app, (current) => {
          const merged = mergeEvents(app, current, envelope.events);
          result = { added: merged.added, duplicates: merged.duplicates, total: merged.events.length };
          return merged.events;
        });
        status = { state: 'success', result };
        return result;
      } catch (error) {
        const structured = toCarrySyncError(error);
        status = { state: 'error', code: structured.code, message: structured.message };
        throw structured;
      }
    },
    getStatus(): ImportStatus { return structuredClone(status); },
  };
}
export type CarrySyncClient<A extends ApplicationId> = ReturnType<typeof createClient<A>>;
