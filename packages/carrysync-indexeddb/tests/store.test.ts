import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { Dexie } from 'dexie';
import {
  CarrySyncError, createClient, createEvent, serializeEvents, type EventStore,
} from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '../src/index.js';
import { app, deviceId, stock, testDb } from './helpers.js';

describe('IndexedDB storage and safe failures', () => {
  it('retains events and identity across a fresh connection and repeated schema-v1 reopen', async () => {
    const db = testDb();
    const store = new IndexedDbEventStore(db);
    const client = createClient(app, store, await getOrCreateDeviceId(db));
    await client.importPayload(serializeEvents(app, [stock(2), stock(1)]));
    const before = await store.list(app);
    const id = await getOrCreateDeviceId(db);
    db.close();
    const reopened = openDb(db.name);
    try {
      const fresh = new IndexedDbEventStore(reopened);
      expect(await fresh.list(app)).toEqual(before);
      expect(await getOrCreateDeviceId(reopened)).toBe(id);
      expect(reopened.verno).toBe(1);
      reopened.close();
      await reopened.open();
      expect(await fresh.list(app)).toEqual(before);
      expect(await getOrCreateDeviceId(reopened)).toBe(id);
    } finally { reopened.close(); }
  });

  it('keeps sorted detached snapshots and preserves another app during replacement/deletion', async () => {
    const db = testDb();
    const store = new IndexedDbEventStore(db);
    const quiz = createEvent('quiz-relay', deviceId, {
      type: 'quiz.answered', data: { quizId: 'math', participantId: deviceId, answers: [{ questionId: 'q1', optionIndex: 0 }] },
    });
    await store.update('quiz-relay', () => [quiz]);
    expect(await store.update(app, () => [stock(3), stock(1), stock(2)])).toEqual([stock(1), stock(2), stock(3)]);
    await store.update(app, () => []);
    expect(await store.list(app)).toEqual([]);
    expect(await store.list('quiz-relay')).toEqual([quiz]);
  });

  it('rejects malformed, version, wrong-app, oversized and conflicting client batches atomically', async () => {
    const store = new IndexedDbEventStore(testDb());
    const client = createClient(app, store, deviceId);
    await client.importPayload(serializeEvents(app, [stock()]));
    const before = await store.list(app);
    const envelope = { protocol: 'carrysync', version: 1, app, events: [stock(2), stock(3)] };
    for (const [payload, code] of [
      ['{', 'INVALID_PAYLOAD'],
      [JSON.stringify({ ...envelope, version: 2 }), 'UNSUPPORTED_VERSION'],
      [JSON.stringify({ ...envelope, app: 'quiz-relay' }), 'WRONG_APPLICATION'],
      ['x'.repeat(1201), 'PAYLOAD_TOO_LARGE'],
      [JSON.stringify({ ...envelope, events: [stock(2), { ...stock(3), data: { productId: 'x', quantityDelta: 0 } }] }), 'INVALID_PAYLOAD'],
      [serializeEvents(app, [stock(2), stock(1, 99)]), 'CONFLICTING_EVENT'],
    ]) {
      await expect(client.importPayload(payload ?? '')).rejects.toMatchObject({ code });
      expect(await store.list(app)).toEqual(before);
      expect(client.getStatus()).toMatchObject({ state: 'error', code });
    }
    expect(await client.importPayload(serializeEvents(app, [stock()]))).toEqual({ added: 0, duplicates: 1, total: 1 });
  });

  it('rejects stored rows whose keys disagree with validated event content', async () => {
    const db = testDb();
    await db.events.put({ app, id: stock(2).id, event: stock(1) });
    const store = new IndexedDbEventStore(db);
    await expect(store.list(app)).rejects.toMatchObject({ code: 'INVALID_EVENT' });
    await expect(store.update(app, () => [])).rejects.toMatchObject({ code: 'INVALID_EVENT' });
    expect(await db.events.count()).toBe(1);
  });

  it('rolls back writes when an actual IDB transaction is aborted after deletion starts', async () => {
    const db = testDb();
    const store = new IndexedDbEventStore(db);
    await store.update(app, () => [stock()]);
    const abort = () => { Dexie.currentTransaction?.abort(); };
    db.events.hook('deleting', abort);
    try {
      await expect(store.update(app, (events) => [...events, stock(2)])).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    } finally { db.events.hook('deleting').unsubscribe(abort); }
    expect(await store.list(app)).toEqual([stock()]);
  });

  it('simulates quota failure during writes after range-delete and rolls everything back', async () => {
    const db = testDb();
    const store = new IndexedDbEventStore(db);
    await store.update(app, () => [stock()]);
    const id = await getOrCreateDeviceId(db);
    const quotaFailure = () => { throw new DOMException('private quota / product details', 'QuotaExceededError'); };
    db.events.hook('creating', quotaFailure);
    try {
      await expect(store.update(app, (events) => [...events, stock(2)])).rejects.toMatchObject({
        code: 'STORAGE_FAILED', message: 'The local event store could not complete the operation.',
      });
    } finally { db.events.hook('creating').unsubscribe(quotaFailure); }
    expect(await store.list(app)).toEqual([stock()]);
    expect(await getOrCreateDeviceId(db)).toBe(id);
  });

  it('maps denied/unavailable open to safe errors for reads, writes and device identity', async () => {
    const db = testDb();
    const store: EventStore = new IndexedDbEventStore(db);
    const denied = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new DOMException('private storage policy', 'SecurityError');
    });
    try {
      for (const operation of [() => store.list(app), () => store.update(app, () => [stock()]), () => getOrCreateDeviceId(db)]) {
        await expect(operation()).rejects.toMatchObject({
          code: 'STORAGE_FAILED', message: 'The local event store could not complete the operation.',
        });
      }
    } finally { denied.mockRestore(); }
  });

  it('rejects blocked schema opening instead of waiting indefinitely or claiming success', async () => {
    const db = testDb();
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(db.name, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await expect(new IndexedDbEventStore(db).list(app)).rejects.toBeInstanceOf(CarrySyncError);
      expect(db.isOpen()).toBe(false);
    } finally { raw.close(); }
  });

  it('rejects async callbacks before writes and observes their late rejection safely', async () => {
    const store = new IndexedDbEventStore(testDb());
    await store.update(app, () => [stock()]);
    const invalid = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      throw new Error('private callback failure');
    }) as unknown as Parameters<EventStore['update']>[1];
    await expect(store.update(app, invalid)).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await store.list(app)).toEqual([stock()]);
  });
});
