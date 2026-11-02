// Device identity persistence for CarrySync (Phase 2).
//
// `getOrCreateDeviceId` returns the stable device UUID, creating it on first call. The
// create-if-absent operation runs inside a single read-write transaction scoped to the `identity`
// table. Dexie serializes `rw` transactions for the same store, so two concurrent callers on a fresh
// database each run get-then-put, but only the first finds the row empty and writes; the second finds
// the row already written and returns the same UUID. This satisfies FR-8 (no duplicate identities,
// no last-write-wins race). Any underlying storage failure is mapped to a safe `STORAGE_FAILED`
// `CarrySyncError` (FR-18).
import type { CarrySyncDb } from './db.js';
import { mapStorageError } from '@carrysync/core';

/**
 * Returns the stable device UUID for `db`, creating it on first call (idempotent across tabs).
 *
 * The get -> create-if-absent -> return sequence runs inside one `rw` transaction on the
 * `identity` table. The UUID is generated synchronously via `crypto.randomUUID()` before the
 * `put`, so no `async` user code runs between the read and the write inside the transaction.
 *
 * @param db - An open `CarrySyncDb` instance.
 * @returns the device UUID string for this database.
 */
export async function getOrCreateDeviceId(db: CarrySyncDb): Promise<string> {
  try {
    return await db.transaction('rw', db.identity, async () => {
      const existing = await db.identity.get('deviceId');
      if (existing) return existing.value;
      const id = crypto.randomUUID();
      await db.identity.put({ key: 'deviceId', value: id });
      return id;
    });
  } catch (error) {
    throw mapStorageError(error);
  }
}
