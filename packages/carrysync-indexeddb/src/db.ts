// Dexie schema for CarrySync persistent event storage (Phase 2).
//
// Two object stores back the adapter:
//   events   — one row per accepted event, keyed by the compound primary key [app, id].
//   identity — a single-row table holding the durable device UUID under the literal key 'deviceId'.
//
// The DB name is injectable (default 'carrysync-v1') so tests can spin up isolated fake databases
// without file-system side effects. Schema is version 1 only; a future v2 migration would extend this
// definition with `this.version(2).stores(...).upgrade(tx => ...)`.
import { Dexie, type Table } from 'dexie';
import type { SyncEvent } from '@carrysync/core';

/** A validated, normalized event stored exactly once per [app, id] composite key. */
export interface StoredEvent {
  /** ApplicationId value — first part of the compound primary key. */
  app: string;
  /** SyncEvent UUID — second part of the compound primary key. */
  id: string;
  /** Validated, normalized serializable event. */
  event: SyncEvent;
}

/** Single-row table: one device identity per database. */
export interface IdentityRow {
  /** Literal primary key; the only row holds the device UUID. */
  key: 'deviceId';
  /** UUID string for this device. */
  value: string;
}

/**
 * Dexie database carrying CarrySync's events and device identity.
 *
 * `events` is keyed by the compound primary key `[app+id]` (Dexie compound-key syntax), which
 * natively enforces per-[app, id] uniqueness and supports efficient per-app range queries. `identity`
 * is keyed by its `key` field and holds exactly one row `{ key: 'deviceId', value: '<uuid>' }`.
 */
export class CarrySyncDb extends Dexie {
  /** Accepted events, one row per [app, id]. Assigned by Dexie from the schema below. */
  events!: Table<StoredEvent, [string, string]>;
  /** Device identity, a single row keyed by 'deviceId'. Assigned by Dexie from the schema below. */
  identity!: Table<IdentityRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      events: '[app+id]',
      identity: 'key',
    });
    // A raw/stale connection can refuse a version upgrade indefinitely. Fail this opener
    // instead of hanging or reporting persistence success. A fresh instance can retry later.
    this.on('blocked', () => {
      this.close();
      return false;
    });
  }
}

/**
 * Open (or create) a CarrySync database.
 *
 * @param name - Injectable DB name; defaults to `'carrysync-v1'`.
 * @returns a `CarrySyncDb` instance. The database is opened lazily on first interaction,
 *          or eagerly via `db.open()`.
 */
export function openDb(name = 'carrysync-v1'): CarrySyncDb {
  return new CarrySyncDb(name);
}
