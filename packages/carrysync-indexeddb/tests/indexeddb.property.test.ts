import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  InMemoryEventStore, createClient, deserializePayload, serializeEvents,
  type ApplicationId, type SyncEvent,
} from '@carrysync/core';
import { IndexedDbEventStore } from '../src/index.js';
import { app, deviceId, stock, testDb } from './helpers.js';

const unicode = fc.array(fc.constantFrom('ধান', 'चावल', 'é', '🧰', '米', 'x'), { minLength: 1, maxLength: 5 })
  .map((parts) => parts.join(''));

describe('persistent event-set equivalence properties', () => {
  it('matches memory events and counts for Unicode, duplicate distributions and interleaved app imports', async () => {
    await fc.assert(fc.asyncProperty(
      unicode,
      fc.array(fc.integer({ min: 0, max: 7 }), { minLength: 2, maxLength: 25 }),
      async (label, order) => {
        const db = testDb('equivalence');
        const memory = new InMemoryEventStore();
        const persistent = new IndexedDbEventStore(db);
        const pool: SyncEvent[] = Array.from({ length: 8 }, (_, id) => id % 2 === 0
          ? stock(id, id + 1, label)
          : {
            ...stock(id), app: 'quiz-relay', type: 'quiz.published',
            data: { quizId: `quiz-${id}`, title: label, questions: [{ id: 'q1', prompt: label, options: [label, 'other'] }] },
          });
        // All UUIDs are distinct despite identical timestamps; then repeat in arbitrary order.
        for (const event of [...pool, ...order.map((id) => pool[id]).filter((event) => event !== undefined)]) {
          const payload = serializeEvents(event.app, [event]);
          expect(deserializePayload(payload, event.app).events).toEqual([event]);
          const m = createClient(event.app, memory, deviceId);
          const p = createClient(event.app, persistent, deviceId);
          expect(await p.importPayload(payload)).toEqual(await m.importPayload(payload));
        }
        for (const application of ['field-ledger', 'quiz-relay'] satisfies ApplicationId[]) {
          expect(await persistent.list(application)).toEqual(await memory.list(application));
        }
        await db.delete();
      },
    ), { numRuns: 100, seed: 20261103 });
  });

  it('rejects generated conflicting batches without changing either adapter', async () => {
    await fc.assert(fc.asyncProperty(unicode, fc.integer({ min: 1, max: 999 }), async (label, quantity) => {
      const db = testDb('conflicts');
      const stores = [new InMemoryEventStore(), new IndexedDbEventStore(db)];
      for (const store of stores) {
        const client = createClient(app, store, deviceId);
        const original = stock(1, quantity, label);
        await client.importPayload(serializeEvents(app, [original]));
        const before = await store.list(app);
        // The compatible new event must also be rolled back when the other event conflicts.
        const conflicting = stock(1, quantity + 1, label);
        await expect(client.importPayload(serializeEvents(app, [stock(2), conflicting])))
          .rejects.toMatchObject({ code: 'CONFLICTING_EVENT' });
        expect(await store.list(app)).toEqual(before);
      }
      await db.delete();
    }), { numRuns: 100, seed: 20261104 });
  });
});
