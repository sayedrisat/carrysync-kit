import { Dexie } from 'dexie';
import {
  CarrySyncError, mapStorageError, mergeEvents,
  type ApplicationId, type EventStore, type SyncEvent,
} from '@carrysync/core';
import { openDb, type CarrySyncDb, type StoredEvent } from './db.js';

/** Revalidate both stored content and its compound key instead of trusting persisted rows. */
function readEvents(app: ApplicationId, rows: StoredEvent[]): SyncEvent[] {
  for (const row of rows) {
    if (!row.event || row.app !== app || row.id !== row.event.id || row.app !== row.event.app) {
      throw new CarrySyncError('INVALID_EVENT', 'Stored event does not match its application and ID.');
    }
  }
  return mergeEvents(app, [], rows.map((row) => row.event)).events;
}

/** Durable EventStore. Share a database name across tabs to share events and identity. */
export class IndexedDbEventStore implements EventStore {
  constructor(readonly db: CarrySyncDb = openDb()) {}

  private rows(app: ApplicationId) {
    return this.db.events.where('[app+id]').between([app, Dexie.minKey], [app, Dexie.maxKey]);
  }

  async list(app: ApplicationId): Promise<SyncEvent[]> {
    try {
      return readEvents(app, await this.rows(app).toArray());
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  async update(
    app: ApplicationId,
    transform: (current: readonly SyncEvent[]) => readonly SyncEvent[],
  ): Promise<SyncEvent[]> {
    try {
      return await this.db.transaction('rw', this.db.events, async () => {
        const current = readEvents(app, await this.rows(app).toArray());
        const next = transform(current);
        // Runtime JS callers can bypass the synchronous callback type. Never await their work.
        if (!Array.isArray(next)) {
          // Observe rejection from an incorrectly supplied async callback without keeping IDB alive.
          void Promise.resolve(next).catch(() => undefined);
          throw mapStorageError(undefined);
        }
        const validated = mergeEvents(app, [], next).events;
        // The port supports whole-set replacement; client imports perform conflict-checked union.
        // All validation completes before the first write, within the same transaction as the read.
        await this.rows(app).delete();
        await this.db.events.bulkPut(validated.map((event) => ({ app, id: event.id, event })));
        return mergeEvents(app, [], validated).events;
      });
    } catch (error) {
      throw mapStorageError(error);
    }
  }
}
