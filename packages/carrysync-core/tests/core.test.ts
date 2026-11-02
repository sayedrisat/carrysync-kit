import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  CarrySyncError, InMemoryEventStore, MAX_PAYLOAD_BYTES, createClient, createEvent,
  decodeQrPayload, deserializePayload, encodeQrPayload, mergeEvents, payloadByteLength,
  serializeEvents, validateEvent, type AppEvent, type EventStore, type SyncEvent,
} from '../src/index.js';
import { describeEventStoreContract } from './event-store.contract.js';

const deviceId = '00000000-0000-4000-8000-000000000001';
const app = 'field-ledger';
function stock(index = 1, delta = 5): AppEvent<'field-ledger'> {
  return {
    app, type: 'stock.moved', id: `10000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId: `product-${index}`, quantityDelta: delta },
  };
}
const envelope = (events: unknown[]) => JSON.stringify({ protocol: 'carrysync', version: 1, app, events });
function expectCode(action: () => unknown, code: CarrySyncError['code']) {
  expect(action).toThrow(CarrySyncError);
  try { action(); } catch (error) { expect(error).toMatchObject({ code }); }
}

describe('events and v1 protocol', () => {
  it('creates UUID-based events with valid metadata and preserves same-time distinct events', () => {
    const input = { type: 'stock.moved', data: { productId: 'rice', quantityDelta: 5 } } as const;
    const a = createEvent(app, deviceId, input);
    const b = createEvent(app, deviceId, input);
    expect(a.id).not.toBe(b.id);
    expect(validateEvent(a, app)).toEqual(a);
    expect(mergeEvents(app, [stock(1)], [stock(2)]).events).toHaveLength(2);
  });

  it('round-trips stock events through the public payload/QR APIs', async () => {
    const event = stock();
    expect(deserializePayload(serializeEvents(app, [event]), app).events).toEqual([event]);
    const qr = await encodeQrPayload(app, [event]);
    expect(qr.svg).toContain('<svg');
    expect(qr.bytes).toBe(payloadByteLength(qr.payload));
    expect(qr.eventCount).toBe(1);
    expect(decodeQrPayload(qr.payload, app).events).toEqual([event]);
  });

  it('round-trips quiz publication and pseudonymous answers separately from FieldLedger', () => {
    const quiz = createEvent('quiz-relay', deviceId, {
      type: 'quiz.published', data: { quizId: 'maths', title: 'Demo', questions: [{ id: 'q1', prompt: '2+2?', options: ['3', '4'] }] },
    });
    const answer = createEvent('quiz-relay', deviceId, {
      type: 'quiz.answered', data: { quizId: 'maths', participantId: deviceId, answers: [{ questionId: 'q1', optionIndex: 1 }] },
    });
    expect(deserializePayload(serializeEvents('quiz-relay', [quiz, answer]), 'quiz-relay').events).toHaveLength(2);
    expectCode(() => deserializePayload(serializeEvents('quiz-relay', [quiz]), app), 'WRONG_APPLICATION');
  });

  it.each(['{', '', 'null', '[]', '{}', '"carrysync"'])('rejects malformed or invalid JSON: %s', (payload) => {
    expectCode(() => deserializePayload(payload, app), 'INVALID_PAYLOAD');
  });

  it.each([0, 2, '1', null])('rejects unsupported version %s', (version) => {
    expectCode(() => deserializePayload(JSON.stringify({ protocol: 'carrysync', version, app, events: [stock()] }), app), 'UNSUPPORTED_VERSION');
  });

  it('rejects a missing version, unknown protocol, unknown fields, and an empty envelope', () => {
    for (const value of [
      { protocol: 'carrysync', app, events: [stock()] },
      { protocol: 'other', version: 1, app, events: [stock()] },
      { protocol: 'carrysync', version: 1, app, events: [stock()], password: 'unexpected' },
      { protocol: 'carrysync', version: 1, app, events: [] },
    ]) expectCode(() => deserializePayload(JSON.stringify(value), app), 'INVALID_PAYLOAD');
  });

  it('rejects hidden fields and invalid quantities, IDs, timestamps and wrong event application', () => {
    for (const invalid of [
      { ...stock(), id: 'timestamp-id' }, { ...stock(), createdAt: 'yesterday' },
      { ...stock(), data: { productId: 'x', quantityDelta: 0 } },
      { ...stock(), data: { productId: 'x', quantityDelta: 1.1 } },
      { ...stock(), data: { productId: 'x', quantityDelta: Infinity } },
      { ...stock(), data: { productId: 'x', quantityDelta: 1, secret: 'hidden' } },
    ]) expectCode(() => validateEvent(invalid, app), 'INVALID_EVENT');
    expectCode(() => validateEvent(stock(), 'quiz-relay'), 'WRONG_APPLICATION');
    expectCode(() => deserializePayload(JSON.stringify({ protocol: 'carrysync', version: 1, app: 'quiz-relay', events: [stock()] }), 'quiz-relay'), 'WRONG_APPLICATION');
  });

  it('uses UTF-8 bytes, accepts the exact limit, and rejects one extra byte before parsing', () => {
    const event = { ...stock(), data: { productId: 'ধান', quantityDelta: 5 } };
    const payload = serializeEvents(app, [event]);
    expect(payloadByteLength(payload)).toBeGreaterThan(payload.length);
    const boundary = payload + ' '.repeat(MAX_PAYLOAD_BYTES - payloadByteLength(payload));
    expect(deserializePayload(boundary, app).events).toEqual([event]);
    expectCode(() => deserializePayload(boundary + ' ', app), 'PAYLOAD_TOO_LARGE');
    expectCode(() => deserializePayload('x'.repeat(MAX_PAYLOAD_BYTES + 1), app), 'PAYLOAD_TOO_LARGE');
    expectCode(() => serializeEvents(app, Array.from({ length: 10 }, (_, i) => stock(i))), 'PAYLOAD_TOO_LARGE');
    expectCode(() => serializeEvents(app, Array.from({ length: 21 }, (_, i) => stock(i))), 'INVALID_PAYLOAD');
  });

  it('produces canonical event and key ordering and removes identical batch duplicates', () => {
    const a = stock(1);
    const b = stock(2);
    const reordered = { data: a.data, createdAt: a.createdAt, deviceId: a.deviceId, id: a.id, type: a.type, app: a.app };
    expect(serializeEvents(app, [a, b, a])).toBe(serializeEvents(app, [b, reordered]));
  });
});

describe('merge and atomic storage', () => {
  it('deduplicates, counts incoming duplicates and returns a sorted detached event set', () => {
    const current = [stock(2)];
    const result = mergeEvents(app, current, [stock(1), stock(2), stock(1)]);
    expect(result).toMatchObject({ added: 1, duplicates: 2 });
    expect(result.events).toEqual([stock(1), stock(2)]);
    result.events[1]!.createdAt = 'changed';
    expect(current[0]!.createdAt).toBe('2026-11-02T00:00:00.000Z');
  });

  it('rejects same-ID different-content conflicts on either side', () => {
    const conflict = stock(1, 99);
    expectCode(() => mergeEvents(app, [stock()], [conflict]), 'CONFLICTING_EVENT');
    expectCode(() => mergeEvents(app, [], [conflict, stock()]), 'CONFLICTING_EVENT');
    expectCode(() => mergeEvents(app, [stock(), conflict], []), 'CONFLICTING_EVENT');
  });

  it('imports twice without duplicating effects and records status', async () => {
    const client = createClient(app, new InMemoryEventStore(), deviceId);
    expect(client.getStatus()).toEqual({ state: 'idle' });
    const payload = serializeEvents(app, [stock()]);
    expect(await client.importPayload(payload)).toEqual({ added: 1, duplicates: 0, total: 1 });
    expect(await client.importPayload(payload)).toEqual({ added: 0, duplicates: 1, total: 1 });
    expect(client.getStatus()).toMatchObject({ state: 'success', result: { total: 1 } });
    const snapshot = client.getStatus();
    if (snapshot.state === 'success') snapshot.result.total = 999;
    expect(client.getStatus()).toMatchObject({ result: { total: 1 } });
  });

  it('does not partially mutate after a malformed batch, conflict, wrong app or oversized payload', async () => {
    const store = new InMemoryEventStore();
    const client = createClient(app, store, deviceId);
    await client.importPayload(serializeEvents(app, [stock()]));
    const before = await client.listEvents();
    const bad = [
      envelope([stock(2), { ...stock(3), data: { productId: 'x', quantityDelta: 0 } }]),
      envelope([stock(2), stock(1, 99)]),
      JSON.stringify({ protocol: 'carrysync', version: 1, app: 'quiz-relay', events: [stock(2)] }),
      'x'.repeat(MAX_PAYLOAD_BYTES + 1),
    ];
    for (const payload of bad) {
      await expect(client.importPayload(payload)).rejects.toBeInstanceOf(CarrySyncError);
      expect(await client.listEvents()).toEqual(before);
      expect(client.getStatus().state).toBe('error');
    }
  });

  it('serializes concurrent memory imports without losing events', async () => {
    const client = createClient(app, new InMemoryEventStore(), deviceId);
    await Promise.all(Array.from({ length: 20 }, (_, i) => client.importPayload(serializeEvents(app, [stock(i)]))));
    expect(await client.listEvents()).toHaveLength(20);
  });

  it('wraps adapter failures without leaking implementation details', async () => {
    const fail = () => { throw new Error('sensitive internal connection details'); };
    const store: EventStore = { async list() { return fail(); }, async update() { return fail(); } };
    const client = createClient(app, store, deviceId);
    await expect(client.importPayload(serializeEvents(app, [stock()]))).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    expect(client.getStatus()).toEqual({ state: 'error', code: 'STORAGE_FAILED', message: 'The local event store could not complete the operation.' });
    await expect(client.listEvents()).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    await expect(client.createEvent({ type: 'stock.moved', data: { productId: 'rice', quantityDelta: 1 } })).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
  });
});

// Shared EventStore contract suite, extracted from the storage assertions above. Runs the same
// adapter-level guarantees (detached snapshots, per-app isolation, rollback, duplicate-safety,
// conflict/invalid rejection, concurrent serialization, failure mapping) for any EventStore factory.
describeEventStoreContract('InMemoryEventStore', () => new InMemoryEventStore());

describe('event-set union properties (compatible IDs only; not domain-state CRDT claims)', () => {
  // An ID always maps to the same content. Conflicting sets are intentionally outside these laws.
  const set = fc.array(fc.integer({ min: 0, max: 100 }), { maxLength: 30 }).map((ids) => ids.map((id) => stock(id)));
  const union = (a: SyncEvent[], b: SyncEvent[]) => mergeEvents(app, a, b).events;
  const options = { numRuns: 300, seed: 20261102 };

  it('is idempotent', () => {
    fc.assert(fc.property(set, (a) => { expect(union(a, a)).toEqual(union([], a)); }), options);
  });
  it('is commutative', () => {
    fc.assert(fc.property(set, set, (a, b) => { expect(union(a, b)).toEqual(union(b, a)); }), options);
  });
  it('is associative', () => {
    fc.assert(fc.property(set, set, set, (a, b, c) => { expect(union(union(a, b), c)).toEqual(union(a, union(b, c))); }), options);
  });
  it('is independent of repeated sequential import order', () => {
    fc.assert(fc.property(set, (events) => {
      const forward = events.reduce((accepted, event) => union(accepted, [event]), [] as SyncEvent[]);
      const reverse = [...events].reverse().reduce((accepted, event) => union(accepted, [event]), [] as SyncEvent[]);
      expect(forward).toEqual(reverse);
    }), options);
  });
});
