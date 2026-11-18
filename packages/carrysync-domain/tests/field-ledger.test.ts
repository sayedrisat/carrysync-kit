import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { serializeEvents, type SyncEvent } from '@carrysync/core';
import {
  buildStockMovement, checkMovement, cleanProductLabel, createFieldLedgerService, listMovements,
  normalizeProductKey, projectInventory,
} from '../src/field-ledger/index.js';
import { DomainError } from '../src/index.js';
import { deviceA, deviceB, memoryClient, shuffle, stock } from './helpers.js';

describe('FieldLedger movement builder', () => {
  it('builds signed stock.moved inputs and reuses the established product spelling', () => {
    expect(buildStockMovement({ productId: '  Rice   25kg ', direction: 'in', quantity: 12 }))
      .toEqual({ type: 'stock.moved', data: { productId: 'Rice 25kg', quantityDelta: 12 } });
    expect(buildStockMovement({ productId: 'RICE 25KG', direction: 'out', quantity: 3 }, [{ productKey: 'rice 25kg', label: 'Rice 25kg' }]))
      .toEqual({ type: 'stock.moved', data: { productId: 'Rice 25kg', quantityDelta: -3 } });
  });

  it.each([
    [{ productId: '   ', direction: 'in', quantity: 1 }, 'productId'],
    [{ productId: 'x'.repeat(81), direction: 'in', quantity: 1 }, 'productId'],
    [{ productId: 7, direction: 'in', quantity: 1 }, 'productId'],
    [{ productId: 'rice', direction: 'sideways', quantity: 1 }, 'direction'],
    [{ productId: 'rice', direction: 'in', quantity: 0 }, 'quantity'],
    [{ productId: 'rice', direction: 'in', quantity: -4 }, 'quantity'],
    [{ productId: 'rice', direction: 'in', quantity: 1.5 }, 'quantity'],
    [{ productId: 'rice', direction: 'in', quantity: 1_000_001 }, 'quantity'],
    [{ productId: 'rice', direction: 'in', quantity: '5' }, 'quantity'],
  ])('rejects invalid draft %j with field %s', (draft, field) => {
    expect(() => buildStockMovement(draft as never)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', details: expect.objectContaining({ field }) }));
  });

  it('normalizes product keys (NFKC, whitespace, case) without altering labels', () => {
    expect(cleanProductLabel('ＲＩＣＥ\t 25kg')).toBe('RICE 25kg');
    expect(normalizeProductKey(' Ｒice   25KG ')).toBe('rice 25kg');
  });
});

describe('FieldLedger projections', () => {
  const events: SyncEvent[] = [
    stock(1, 'Rice', 20), stock(2, 'rice ', -16), stock(3, 'RICE', 1, { deviceId: deviceB }),
    stock(4, 'Oil', 3), stock(5, 'Salt', 2), stock(6, 'Salt', -2), stock(7, 'Sugar', 4), stock(8, 'Sugar', -9),
  ];

  it('computes deterministic balances, statuses and warnings grouped by normalized key', () => {
    const snapshot = projectInventory(events);
    expect(snapshot.products.map((p) => [p.productKey, p.label, p.balance, p.status])).toEqual([
      ['oil', 'Oil', 3, 'low'], ['rice', 'Rice', 5, 'low'], ['salt', 'Salt', 0, 'out'], ['sugar', 'Sugar', -5, 'negative'],
    ]);
    const rice = snapshot.products.find((p) => p.productKey === 'rice');
    expect(rice).toMatchObject({ labels: ['RICE', 'Rice', 'rice'], totalIn: 21, totalOut: 16, movementCount: 3, threshold: 5 });
    expect(snapshot.warnings.map((w) => [w.code, w.productKey])).toEqual([
      ['NEGATIVE_STOCK', 'sugar'], ['OUT_OF_STOCK', 'salt'], ['LOW_STOCK', 'oil'], ['LOW_STOCK', 'rice'],
    ]);
    expect(snapshot.totals).toEqual({ productCount: 4, movementCount: 8, unitsOnHand: 8 });
    // Historical events are never rewritten by normalization.
    expect(events[1]?.type === 'stock.moved' && events[1].data.productId).toBe('rice ');
  });

  it('applies global and per-product low-stock thresholds and validates them', () => {
    const snapshot = projectInventory(events, { lowStockThreshold: 2, thresholds: { ' RICE ': 10 } });
    expect(snapshot.products.find((p) => p.productKey === 'oil')?.status).toBe('ok');
    expect(snapshot.products.find((p) => p.productKey === 'rice')).toMatchObject({ threshold: 10, status: 'low' });
    expect(() => projectInventory(events, { lowStockThreshold: -1 })).toThrow(DomainError);
  });

  it('ignores QuizRelay events and counts duplicate IDs once', () => {
    const quiz = { app: 'quiz-relay', type: 'quiz.published', id: '20000000-0000-4000-8000-000000000001', deviceId: deviceA, createdAt: '2026-11-14T08:00:00.000Z', data: { quizId: 'q', title: 't', questions: [{ id: 'a', prompt: 'p', options: ['x', 'y'] }] } } as SyncEvent;
    expect(projectInventory([...events, ...events, quiz])).toEqual(projectInventory(events));
  });

  it('lists history newest-first with running balances, origin and product filtering', () => {
    const history = listMovements(events, { localDeviceId: deviceA, productId: 'RICE' });
    expect(history.map((m) => [m.recordedLabel, m.productLabel, m.direction, m.quantity, m.balanceAfter, m.origin])).toEqual([
      ['RICE', 'Rice', 'in', 1, 5, 'imported'], ['rice', 'Rice', 'out', 16, 4, 'local'], ['Rice', 'Rice', 'in', 20, 20, 'local'],
    ]);
    expect(listMovements(events, { order: 'oldest', limit: 2 }).map((m) => [m.eventId, m.origin])).toEqual([[events[0]?.id, 'unknown'], [events[1]?.id, 'unknown']]);
    expect(() => listMovements(events, { limit: -1 })).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('orders equal timestamps by event ID and tolerates mixed timestamp precision', () => {
    const a = { ...stock(2, 'tea', 5), createdAt: '2026-11-14T08:00:00Z' };
    const b = { ...stock(1, 'tea', -1), createdAt: '2026-11-14T08:00:00.000Z' };
    expect(listMovements([a, b], { order: 'oldest' }).map((m) => m.balanceAfter)).toEqual([-1, 4]);
  });

  it('predicts the effect of a movement', () => {
    const snapshot = projectInventory(events);
    expect(checkMovement(snapshot, buildStockMovement({ productId: 'rice', direction: 'out', quantity: 6 }))).toEqual({ productKey: 'rice', balanceBefore: 5, balanceAfter: -1, warning: 'NEGATIVE_STOCK' });
    expect(checkMovement(snapshot, buildStockMovement({ productId: 'new', direction: 'in', quantity: 50 }))).toEqual({ productKey: 'new', balanceBefore: 0, balanceAfter: 50 });
  });

  const row = fc.record({ product: fc.constantFrom('Rice', 'rice', ' RICE ', 'Oil', 'চাল'), delta: fc.integer({ min: -500, max: 500 }).filter((d) => d !== 0), minute: fc.integer({ min: 0, max: 30 }) });
  it('property: projection is order-independent, re-import idempotent and balances equal summed deltas', () => {
    fc.assert(fc.property(fc.array(row, { minLength: 1, maxLength: 40 }), fc.integer(), (rows, seed) => {
      const evs = rows.map((r, i) => stock(i + 1, r.product, r.delta, { minute: r.minute }));
      const base = projectInventory(evs);
      expect(projectInventory(shuffle(evs, seed))).toEqual(base);
      expect(projectInventory([...evs, ...shuffle(evs, seed + 1)])).toEqual(base);
      expect(listMovements(shuffle(evs, seed))).toEqual(listMovements(evs));
      const sums = new Map<string, number>();
      for (const r of rows) sums.set(normalizeProductKey(r.product), (sums.get(normalizeProductKey(r.product)) ?? 0) + r.delta);
      expect(Object.fromEntries(base.products.map((p) => [p.productKey, p.balance]))).toEqual(Object.fromEntries(sums));
      for (const p of base.products) expect(p.balance).toBe(p.totalIn - p.totalOut);
    }), { seed: 20261115, numRuns: 200 });
  });
});

describe('FieldLedger service', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('records movements, enforces the stock policy and notifies listeners', async () => {
    // Distinct timestamps: same-millisecond local events are ordered by random event ID.
    let tick = Date.UTC(2026, 10, 14);
    vi.useFakeTimers({ toFake: ['Date'] });
    const advance = () => vi.setSystemTime((tick += 1000));
    advance();
    const service = createFieldLedgerService({ client: memoryClient('field-ledger', deviceA), deviceId: deviceA });
    let changes = 0;
    const off = service.onChange(() => { changes += 1; });
    const first = await service.recordMovement({ productId: 'Rice', direction: 'in', quantity: 10 });
    expect(first).toMatchObject({ movement: { direction: 'in', quantity: 10, balanceAfter: 10, origin: 'local' }, product: { balance: 10, status: 'ok' } });
    advance();
    const second = await service.recordMovement({ productId: ' rice', direction: 'out', quantity: 6 });
    expect(second).toMatchObject({ warning: 'LOW_STOCK', product: { balance: 4, labels: ['Rice'] } });
    await expect(service.recordMovement({ productId: 'RICE', direction: 'out', quantity: 5 })).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { productKey: 'rice', available: 4 } });
    advance();
    expect((await service.recordMovement({ productId: 'RICE', direction: 'out', quantity: 5 }, { allowNegative: true })).warning).toBe('NEGATIVE_STOCK');
    expect(changes).toBe(3);
    off();
    await service.recordMovement({ productId: 'Oil', direction: 'in', quantity: 1 });
    expect(changes).toBe(3);
    expect((await service.getProduct('OIL'))?.balance).toBe(1);
    expect((await service.getHistory({ productId: 'rice' })).map((m) => m.delta)).toEqual([-5, -6, 10]);
  });

  it('exports selected records as QR batches that another device previews and imports', async () => {
    const sender = createFieldLedgerService({ client: memoryClient('field-ledger', deviceA), deviceId: deviceA });
    const receiver = createFieldLedgerService({ client: memoryClient('field-ledger', deviceB), deviceId: deviceB });
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) ids.push((await sender.recordMovement({ productId: i % 2 ? 'Oil' : 'Rice', direction: 'in', quantity: i + 1 })).event.id);
    await expect(sender.prepareExport([])).rejects.toMatchObject({ code: 'EMPTY_SELECTION' });
    await expect(sender.prepareExport(['10000000-0000-4000-8000-999999999999'])).rejects.toMatchObject({ code: 'INVALID_INPUT', details: { field: 'eventIds' } });
    const qrs = await sender.prepareExport(ids, { maxBytes: 900 });
    expect(qrs.length).toBeGreaterThan(1);
    expect(qrs.map((qr) => [qr.index, qr.total])).toEqual(qrs.map((_, i) => [i, qrs.length]));
    let notified = 0;
    receiver.onChange(() => { notified += 1; });
    for (const qr of qrs) {
      expect(qr.svg).toContain('<svg');
      const preview = await receiver.previewImport(qr.payload);
      expect(preview.canImport).toBe(true);
      expect(preview.impact.every((item) => item.balanceAfter === item.balanceBefore + item.delta)).toBe(true);
      expect((await receiver.importPayload(qr.payload)).added).toBe(qr.eventCount);
    }
    expect(notified).toBe(qrs.length);
    expect(await receiver.getInventory()).toEqual(await sender.getInventory());
    // Rescanning is a duplicate: balances unchanged, no notification.
    expect((await receiver.importPayload(qrs[0]?.payload ?? '')).added).toBe(0);
    expect(notified).toBe(qrs.length);
    expect((await receiver.getHistory())[0]?.origin).toBe('imported');
  });

  it('previews negative-stock impact before an import is confirmed', async () => {
    // Pin the clock: the local 'Rice' movement must predate the imported fixture (08:40Z) so its
    // spelling stays the canonical label regardless of the real date the suite runs on.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 10, 14, 8, 0));
    const receiver = createFieldLedgerService({ client: memoryClient('field-ledger', deviceB), deviceId: deviceB });
    await receiver.recordMovement({ productId: 'Rice', direction: 'in', quantity: 2 });
    const preview = await receiver.previewImport(serializeEvents('field-ledger', [stock(40, 'RICE', -5)]));
    expect(preview.impact).toEqual([{ productKey: 'rice', label: 'Rice', delta: -5, balanceBefore: 2, balanceAfter: -3, warning: 'NEGATIVE_STOCK' }]);
    expect((await receiver.getInventory()).products[0]?.balance).toBe(2);
  });
});
