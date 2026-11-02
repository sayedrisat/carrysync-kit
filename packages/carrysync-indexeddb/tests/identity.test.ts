// Device identity tests for getOrCreateDeviceId (FR-7, FR-8).
//
// fake-indexeddb's `auto` import installs the global IDB environment (indexedDB, IDBKeyRange, ...)
// so Dexie runs entirely in Node without a browser. Each case uses a unique DB name so the fake
// backing stores stay isolated.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getOrCreateDeviceId } from '../src/identity.js';
import { openDb } from '../src/db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A unique DB name per case to keep fake-indexeddb stores isolated. */
function uniqueName(label: string): string {
  return `identity-test-${label}-${Date.now()}-${Math.random()}`;
}

describe('getOrCreateDeviceId', () => {
  it('first call returns a valid UUID', async () => {
    const db = openDb(uniqueName('first'));
    try {
      const id = await getOrCreateDeviceId(db);
      expect(id).toMatch(UUID_RE);
    } finally {
      db.close();
    }
  });

  it('repeated calls return the same UUID', async () => {
    const db = openDb(uniqueName('repeat'));
    try {
      const first = await getOrCreateDeviceId(db);
      const second = await getOrCreateDeviceId(db);
      expect(first).toMatch(UUID_RE);
      expect(second).toBe(first);
    } finally {
      db.close();
    }
  });

  it('two concurrent calls on a fresh DB return the same UUID', async () => {
    const db = openDb(uniqueName('concurrent'));
    try {
      const [a, b] = await Promise.all([
        getOrCreateDeviceId(db),
        getOrCreateDeviceId(db),
      ]);
      expect(a).toMatch(UUID_RE);
      expect(b).toBe(a);
    } finally {
      db.close();
    }
  });

  it('cleared DB returns a new UUID', async () => {
    const db = openDb(uniqueName('cleared'));
    try {
      const first = await getOrCreateDeviceId(db);
      expect(first).toMatch(UUID_RE);

      await db.identity.clear();

      const second = await getOrCreateDeviceId(db);
      expect(second).toMatch(UUID_RE);
      expect(second).not.toBe(first);
    } finally {
      db.close();
    }
  });
});
