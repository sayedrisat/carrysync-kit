import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createClient } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';

const db = openDb(`carrysync-public-import-${crypto.randomUUID()}`);
try {
  const store = new IndexedDbEventStore(db);
  const id = await getOrCreateDeviceId(db);
  const client = createClient('field-ledger', store, id);
  const event = await client.createEvent({ type: 'stock.moved', data: { productId: 'demo-rice', quantityDelta: 5 } });
  db.close();
  await db.open();
  assert.equal(await getOrCreateDeviceId(db), id);
  assert.deepEqual(await client.listEvents(), [event]);
  assert.equal((await client.importPayload((await client.prepareExport([event])).payload)).duplicates, 1);
  console.log('Public @carrysync/indexeddb import verified: persistent identity, reopen retention and duplicate-safe client import.');
} finally { await db.delete(); }
