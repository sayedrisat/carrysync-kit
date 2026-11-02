// Smoke test: CarrySyncDb opens and closes against an in-memory fake IndexedDB.
// fake-indexeddb's `auto` import installs globalThis.indexedDB and IDBKeyRange (and the rest of the
// IDB globals) so Dexie can run entirely in Node without a browser.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CarrySyncDb, openDb } from '../src/db.js';

describe('CarrySyncDb smoke', () => {
  it('opens and closes a database via openDb', async () => {
    const db = openDb('test-db-' + Date.now());
    // Eagerly open so the schema (events + identity stores) is created up front.
    await db.open();
    expect(db.isOpen()).toBe(true);

    // The two object stores declared in version(1) must exist.
    expect(db.table('events').name).toBe('events');
    expect(db.table('identity').name).toBe('identity');

    db.close();
    expect(db.isOpen()).toBe(false);
  });

  it('opens and closes a database via the CarrySyncDb constructor', async () => {
    const db = new CarrySyncDb('test-ctor-' + Date.now());
    await db.open();
    expect(db.isOpen()).toBe(true);
    expect(Array.from(db.tables).map((t) => t.name).sort()).toEqual(['events', 'identity']);
    db.close();
    expect(db.isOpen()).toBe(false);
  });
});
