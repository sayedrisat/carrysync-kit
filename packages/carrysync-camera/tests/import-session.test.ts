import { describe, expect, it, vi } from 'vitest';
import {
  createClient, InMemoryEventStore, serializeEvents, type AppEvent,
} from '@carrysync/core';
import { QrImportSession } from '../src/index.js';

const deviceId = '00000000-0000-4000-8000-000000000001';
const event: AppEvent<'field-ledger'> = {
  app: 'field-ledger', type: 'stock.moved', id: '10000000-0000-4000-8000-000000000001',
  deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId: 'rice', quantityDelta: 5 },
};
const payload = serializeEvents('field-ledger', [event]);

describe('camera/manual shared import session', () => {
  it('reviews without mutation, then uses core import and reports duplicate rescans', async () => {
    const client = createClient('field-ledger', new InMemoryEventStore(), deviceId);
    const session = new QrImportSession('field-ledger', client);
    expect(session.reviewText(payload)).toMatchObject({ state: 'review', envelope: { events: [event] } });
    expect(await client.listEvents()).toEqual([]);
    expect(await session.confirmImport()).toMatchObject({ state: 'imported', result: { added: 1, total: 1 } });
    session.reviewText(payload);
    expect(await session.confirmImport()).toMatchObject({ state: 'duplicate', result: { added: 0, duplicates: 1, total: 1 } });
    expect(await client.listEvents()).toEqual([event]);
  });

  it.each([
    ['{', 'INVALID_PAYLOAD'],
    ['x'.repeat(1201), 'PAYLOAD_TOO_LARGE'],
    [payload.replace('"version":1', '"version":2'), 'UNSUPPORTED_VERSION'],
  ])('rejects invalid text with core errors and clears an earlier pending review', async (text, code) => {
    const importer = { importPayload: vi.fn() };
    const session = new QrImportSession('field-ledger', importer);
    session.reviewText(payload);
    expect(session.reviewText(text)).toMatchObject({ state: 'error', code });
    await session.confirmImport();
    expect(importer.importPayload).not.toHaveBeenCalled();
  });

  it('checks the existing UTF-8 byte bound for multibyte text', () => {
    const session = new QrImportSession('field-ledger', { importPayload: vi.fn() });
    expect(session.reviewText('米'.repeat(401))).toMatchObject({ state: 'error', code: 'PAYLOAD_TOO_LARGE' });
  });

  it('rejects cross-app scanner text before calling any importer', async () => {
    const importer = { importPayload: vi.fn() };
    const session = new QrImportSession('quiz-relay', importer);
    expect(session.reviewText(payload)).toMatchObject({ state: 'error', code: 'WRONG_APPLICATION' });
    await session.confirmImport();
    expect(importer.importPayload).not.toHaveBeenCalled();
  });

  it('reports conflicts from core without partially changing accepted records', async () => {
    const client = createClient('field-ledger', new InMemoryEventStore(), deviceId);
    await client.importPayload(payload);
    const session = new QrImportSession('field-ledger', client);
    session.reviewText(serializeEvents('field-ledger', [{ ...event, data: { productId: 'rice', quantityDelta: 99 } }]));
    expect(await session.confirmImport()).toMatchObject({ state: 'error', code: 'CONFLICTING_EVENT' });
    expect(await client.listEvents()).toEqual([event]);
  });

  it('single-flights double confirmation and ignores replacement text while importing', async () => {
    let complete: ((value: { added: number; duplicates: number; total: number }) => void) | undefined;
    const importer = { importPayload: vi.fn(() => new Promise<{ added: number; duplicates: number; total: number }>((resolve) => { complete = resolve; })) };
    const session = new QrImportSession('field-ledger', importer);
    session.reviewText(payload);
    const first = session.confirmImport();
    expect(session.confirmImport()).toBe(first);
    expect(session.reviewText('{')).toEqual({ state: 'importing' });
    expect(session.clear()).toEqual({ state: 'importing' });
    await Promise.resolve();
    complete?.({ added: 1, duplicates: 0, total: 1 });
    expect(await first).toMatchObject({ state: 'imported' });
    expect(importer.importPayload).toHaveBeenCalledTimes(1);
  });

  it('detaches snapshots, supports unsubscribe, and isolates faulty UI subscribers', async () => {
    const client = createClient('field-ledger', new InMemoryEventStore(), deviceId);
    const session = new QrImportSession('field-ledger', client);
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.subscribe(() => { throw new Error('UI failure'); });
    const snapshot = session.reviewText(payload);
    if (snapshot.state === 'review') snapshot.envelope.events.length = 0;
    expect(session.getState()).toMatchObject({ envelope: { events: [event] } });
    unsubscribe();
    const calls = listener.mock.calls.length;
    expect(await session.confirmImport()).toMatchObject({ state: 'imported' });
    expect(listener).toHaveBeenCalledTimes(calls);
  });

  it('maps unknown importer failures without leaking exception text', async () => {
    const session = new QrImportSession('field-ledger', { async importPayload() { throw new Error('secret disk path'); } });
    session.reviewText(payload);
    expect(await session.confirmImport()).toEqual({
      state: 'error', code: 'STORAGE_FAILED', message: 'The local event store could not complete the operation.',
    });
  });
});
