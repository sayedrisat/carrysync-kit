import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getOrCreateDeviceId, openDb } from '../src/index.js';
import { testDb } from './helpers.js';

describe('identity persistence and integrity', () => {
  it('serializes initialization across independent connections to one fresh database', async () => {
    const a = testDb();
    const b = openDb(a.name);
    try {
      const identities = await Promise.all(Array.from({ length: 12 }, (_, i) => getOrCreateDeviceId(i % 2 ? a : b)));
      expect(new Set(identities).size).toBe(1);
      expect(await a.identity.count()).toBe(1);
    } finally { b.close(); }
  });

  it('does not silently replace a corrupt persisted identity', async () => {
    const db = testDb();
    await db.identity.put({ key: 'deviceId', value: 'corrupt-private-value' });
    await expect(getOrCreateDeviceId(db)).rejects.toMatchObject({
      code: 'STORAGE_FAILED', message: 'The local event store could not complete the operation.',
    });
    expect((await db.identity.get('deviceId'))?.value).toBe('corrupt-private-value');
  });
});
