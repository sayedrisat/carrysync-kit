import { type ApplicationId, type SyncEvent } from './events.js';
import { mergeEvents } from './merge.js';

/**
 * Implementations MUST serialize updates per application, validate the whole batch,
 * commit all-or-nothing, and return detached snapshots. IndexedDB adapters must do
 * read + merge + write in ONE readwrite transaction, including across tabs.
 */
export interface EventStore {
  list(app: ApplicationId): Promise<SyncEvent[]>;
  update(app: ApplicationId, transform: (current: readonly SyncEvent[]) => readonly SyncEvent[]): Promise<SyncEvent[]>;
}

/** Session-only reference adapter. No persistence across refreshes. */
export class InMemoryEventStore implements EventStore {
  private readonly events = new Map<ApplicationId, SyncEvent[]>();

  async list(app: ApplicationId): Promise<SyncEvent[]> {
    return mergeEvents(app, [], this.events.get(app) ?? []).events;
  }

  async update(app: ApplicationId, transform: (current: readonly SyncEvent[]) => readonly SyncEvent[]): Promise<SyncEvent[]> {
    // Deliberately no await between read and commit: updates cannot interleave in this JS realm.
    const current = mergeEvents(app, [], this.events.get(app) ?? []).events;
    const next = mergeEvents(app, [], transform(current)).events;
    this.events.set(app, next);
    return mergeEvents(app, [], next).events;
  }
}
