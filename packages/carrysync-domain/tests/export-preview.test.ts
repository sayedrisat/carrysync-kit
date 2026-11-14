import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  CarrySyncError, InMemoryEventStore, MAX_PAYLOAD_BYTES, createClient, createEvent, deserializePayload,
  payloadByteLength, serializeEvents, type SyncEvent,
} from '@carrysync/core';
import { DomainError, describeError, measureExport, planExportBatches, previewImport } from '../src/index.js';
import { deviceA, deviceB, memoryClient, shuffle, stock } from './helpers.js';

const bigQuiz = () => createEvent('quiz-relay', deviceA, {
  type: 'quiz.published',
  data: {
    quizId: 'big', title: 'T'.repeat(80),
    questions: Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, prompt: 'P'.repeat(200), options: ['a', 'b', 'c', 'd'].map((o) => o.repeat(80)) })),
  },
});

describe('export measurement and batch planning', () => {
  it('measures exactly the bytes serializeEvents produces, counting duplicates once', () => {
    const events = [stock(1, 'rice', 5), stock(2, 'oil', -2), stock(1, 'rice', 5)];
    const measured = measureExport('field-ledger', events);
    expect(measured).toEqual({ bytes: payloadByteLength(serializeEvents('field-ledger', events)), eventCount: 2, limit: MAX_PAYLOAD_BYTES, fits: true });
  });

  it('reports non-fitting selections without throwing and validates options', () => {
    const many = Array.from({ length: 8 }, (_, i) => stock(i + 1, 'rice', 1));
    expect(measureExport('field-ledger', many).fits).toBe(false);
    expect(measureExport('field-ledger', [stock(1, 'rice', 1)], { maxBytes: 100 }).fits).toBe(false);
    expect(() => measureExport('field-ledger', [])).toThrow(expect.objectContaining({ code: 'EMPTY_SELECTION' }));
    for (const maxBytes of [0, 1201, 1.5, Number.NaN]) {
      expect(() => planExportBatches('field-ledger', many, { maxBytes })).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', details: { field: 'maxBytes', limit: 1200 } }));
    }
    expect(() => measureExport('quiz-relay', many)).toThrow(expect.objectContaining({ code: 'WRONG_APPLICATION' }));
  });

  it('splits into chronological, independently importable batches within the budget', async () => {
    const events = Array.from({ length: 11 }, (_, i) => stock(i + 1, `product-${i % 3}`, i + 1));
    const plan = planExportBatches('field-ledger', events, { maxBytes: 800 });
    expect(plan.totalEvents).toBe(11);
    expect(plan.batches.length).toBeGreaterThan(1);
    expect(plan.batches.flatMap((batch) => batch.events.map((event) => event.id))).toEqual(events.map((event) => event.id));
    const receiver = memoryClient('field-ledger', deviceB);
    for (const batch of plan.batches) {
      const payload = serializeEvents('field-ledger', batch.events);
      expect(payloadByteLength(payload)).toBe(batch.bytes);
      expect(batch.bytes).toBeLessThanOrEqual(800);
      expect((await receiver.importPayload(payload)).added).toBe(batch.eventCount);
    }
    expect(await receiver.listEvents()).toHaveLength(11);
  });

  it('raises EVENT_TOO_LARGE for a single oversized event instead of truncating', () => {
    const quiz = bigQuiz();
    expect(() => serializeEvents('quiz-relay', [quiz])).toThrow(expect.objectContaining({ code: 'PAYLOAD_TOO_LARGE' }));
    let error: unknown;
    try { planExportBatches('quiz-relay', [quiz]); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'EVENT_TOO_LARGE', details: { eventId: quiz.id, limit: 1200 } });
    expect((error as DomainError).details.bytes).toBeGreaterThan(1200);
    expect(() => planExportBatches('field-ledger', [stock(1, 'rice', 1)], { maxBytes: 200 })).toThrow(expect.objectContaining({ code: 'EVENT_TOO_LARGE' }));
  });

  it('property: batches cover the selection exactly, fit, and are independent of input order', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ product: fc.constantFrom('rice', 'oil', 'চাল', 'salt 1kg'), delta: fc.integer({ min: 1, max: 999 }), minute: fc.integer({ min: 0, max: 50 }) }), { minLength: 1, maxLength: 30 }),
      fc.integer({ min: 320, max: 1200 }), fc.integer(),
      (rows, maxBytes, seed) => {
        const events = rows.map((row, i) => stock(i + 1, row.product, row.delta, { minute: row.minute }));
        const plan = planExportBatches('field-ledger', events, { maxBytes });
        const reordered = planExportBatches('field-ledger', shuffle(events, seed), { maxBytes });
        expect(reordered).toEqual(plan);
        expect(plan.batches.flatMap((batch) => batch.events.map((event) => event.id)).sort()).toEqual(events.map((event) => event.id).sort());
        for (const batch of plan.batches) {
          expect(batch.bytes).toBeLessThanOrEqual(maxBytes);
          expect(deserializePayload(serializeEvents('field-ledger', batch.events), 'field-ledger').events).toHaveLength(batch.eventCount);
        }
      },
    ), { seed: 20261114, numRuns: 150 });
  });
});

describe('read-only import preview', () => {
  it('classifies new, duplicate and conflicting events without writing', async () => {
    const store = new InMemoryEventStore();
    const client = createClient('field-ledger', store, deviceA);
    const local = await client.createEvent({ type: 'stock.moved', data: { productId: 'rice', quantityDelta: 5 } });
    const conflicting: SyncEvent = { ...stock(2, 'oil', 1), id: local.id };
    const fresh = stock(3, 'salt', 4);
    const before = await client.listEvents();

    const ok = previewImport('field-ledger', before, serializeEvents('field-ledger', [local, fresh]));
    expect(ok).toMatchObject({ eventCount: 2, canImport: true, conflicts: [] });
    expect(ok.newEvents.map((event) => event.id)).toEqual([fresh.id]);
    expect(ok.duplicateEvents.map((event) => event.id)).toEqual([local.id]);

    const bad = previewImport('field-ledger', before, serializeEvents('field-ledger', [conflicting, fresh]));
    expect(bad).toMatchObject({ canImport: false, conflicts: [{ eventId: local.id }] });
    expect(await client.listEvents()).toEqual(before);
  });

  it('throws the import error codes for invalid or wrong-app payloads', () => {
    expect(() => previewImport('field-ledger', [], '{')).toThrow(expect.objectContaining({ code: 'INVALID_PAYLOAD' }));
    const quiz = serializeEvents('quiz-relay', [createEvent('quiz-relay', deviceA, { type: 'quiz.published', data: { quizId: 'q', title: 't', questions: [{ id: 'a', prompt: 'p', options: ['x', 'y'] }] } })]);
    expect(() => previewImport('field-ledger', [], quiz)).toThrow(expect.objectContaining({ code: 'WRONG_APPLICATION' }));
    expect(() => previewImport('field-ledger', [], 'x'.repeat(1201))).toThrow(expect.objectContaining({ code: 'PAYLOAD_TOO_LARGE' }));
  });

  it('is advisory: the real import revalidates against the store as it is at commit time', async () => {
    const client = memoryClient('field-ledger', deviceB);
    const incoming = stock(7, 'rice', 3);
    const payload = serializeEvents('field-ledger', [incoming]);
    expect(previewImport('field-ledger', await client.listEvents(), payload).canImport).toBe(true);
    // A conflicting record with the same ID arrives (e.g. from another tab) after the preview.
    const conflictingPayload = serializeEvents('field-ledger', [{ ...incoming, data: { productId: 'rice', quantityDelta: 300 } }]);
    await client.importPayload(conflictingPayload);
    const snapshot = await client.listEvents();
    await expect(client.importPayload(payload)).rejects.toMatchObject({ code: 'CONFLICTING_EVENT' });
    expect(await client.listEvents()).toEqual(snapshot);
  });
});

describe('describeError', () => {
  it('maps domain, SDK, camera and unknown errors to safe display text', () => {
    expect(describeError(new DomainError('INSUFFICIENT_STOCK', { available: 2 }))).toMatchObject({ source: 'domain', code: 'INSUFFICIENT_STOCK', details: { available: 2 } });
    expect(describeError(new CarrySyncError('WRONG_APPLICATION', 'x'))).toMatchObject({ source: 'sync', code: 'WRONG_APPLICATION' });
    const camera = Object.assign(new Error('Camera permission was denied.'), { name: 'CameraError', code: 'PERMISSION_DENIED' });
    expect(describeError(camera)).toEqual({ source: 'camera', code: 'PERMISSION_DENIED', message: 'Camera permission was denied.' });
    expect(describeError(new TypeError('secret internals'))).toEqual({ source: 'unknown', code: 'UNKNOWN', message: 'Something went wrong. Please retry.' });
  });
});
