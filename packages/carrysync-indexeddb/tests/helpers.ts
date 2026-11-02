import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import type { AppEvent } from '@carrysync/core';
import { openDb, type CarrySyncDb } from '../src/index.js';

export const app = 'field-ledger';
export const deviceId = '00000000-0000-4000-8000-000000000001';
const databases: CarrySyncDb[] = [];

export function testDb(name = 'storage'): CarrySyncDb {
  const db = openDb(`carrysync-test-${name}-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases.splice(0)) {
    db.close();
    await db.delete();
  }
});

export function stock(index = 1, quantityDelta = 5, productId = `product-${index}`): AppEvent<'field-ledger'> {
  return {
    app, type: 'stock.moved', id: `10000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId, quantityDelta },
  };
}
