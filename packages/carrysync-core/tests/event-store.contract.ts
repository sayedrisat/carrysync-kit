import { describe, expect, it } from 'vitest';
import {
  CarrySyncError, mapStorageError,
  type AppEvent, type EventStore,
} from '../src/index.js';

const deviceId = '00000000-0000-4000-8000-000000000001';
const app = 'field-ledger';

function stock(index = 1, delta = 5): AppEvent<'field-ledger'> {
  return {
    app, type: 'stock.moved', id: `10000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId: `product-${index}`, quantityDelta: delta },
  };
}

/** Awaits an action that must reject, then asserts the rejected value is a CarrySyncError with `code`. */
async function expectRejectCode(action: () => Promise<unknown>, code: CarrySyncError['code']): Promise<void> {
  const error: unknown = await action().catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(CarrySyncError);
  expect(error).toMatchObject({ code });
}

/**
 * Reusable EventStore contract suite. Run against any adapter with
 * `describeEventStoreContract('Name', () => new AdapterStore())`.
 *
 * Each case drives the EventStore port directly (`store.list`/`store.update`) and mirrors the storage
 * assertions previously inlined in core.test.ts, plus the adapter contract additions from TR-1.
 * No existing assertion is weakened; the fast-check seeds remain untouched.
 */
export function describeEventStoreContract(
  name: string, makeStore: () => EventStore, mapsTransformErrors = false,
): void {
  describe(`${name} EventStore contract`, () => {
    it('list and update return detached snapshots; mutation does not corrupt storage', async () => {
      const store = makeStore();
      const updated = await store.update(app, () => [stock()]);
      expect(updated).toEqual([stock()]);
      // Mutating the update() return value must not corrupt committed storage.
      updated[0]!.data = { productId: 'changed', quantityDelta: 1 };
      expect(await store.list(app)).toEqual([stock()]);
      // Mutating the list() return value must not corrupt committed storage.
      const snapshot = await store.list(app);
      expect(snapshot).toEqual([stock()]);
      snapshot[0]!.data = { productId: 'changed', quantityDelta: 1 };
      expect(await store.list(app)).toEqual([stock()]);
    });

    it('isolates events per application', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      expect(await store.list(app)).toEqual([stock()]);
      expect(await store.list('quiz-relay')).toEqual([]);
    });

    it('rolls back when a transform throws, leaving prior events unchanged', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      const attempt = store.update(app, (events) => {
        events[0]!.createdAt = 'bad';
        throw new Error('cancel');
      });
      if (mapsTransformErrors) {
        await expectRejectCode(() => attempt, 'STORAGE_FAILED');
      } else {
        // Preserve the original Day 1 memory-adapter exception assertion unchanged.
        await expect(attempt).rejects.toThrow('cancel');
      }
      expect(await store.list(app)).toEqual([stock()]);
    });

    it('rejects an async transform without mutating accepted events (FR-11)', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      const before = await store.list(app);
      // The port types the transform as synchronous, which enforces FR-11 at compile time. This case
      // deliberately bypasses the types — as a JS caller or a cast-using caller could — to verify the
      // runtime safety net: both delivered adapters reject rather than persist a stale replacement set.
      type Transform = Parameters<EventStore['update']>[1];
      const asyncTransform = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return [stock(2)];
      }) as unknown as Transform;
      const attempt = store.update(app, asyncTransform);
      // Memory rejects the non-iterable result; IndexedDB explicitly guards before any write.
      await expect(attempt).rejects.toBeDefined();
      expect(await store.list(app)).toEqual(before);
    });

    it('preserves an original domain CarrySyncError and rolls back the whole transform', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      const failure = new CarrySyncError('CONFLICTING_EVENT', 'Explicit domain rejection.');
      await expect(store.update(app, () => { throw failure; })).rejects.toBe(failure);
      expect(await store.list(app)).toEqual([stock()]);
    });

    it('is duplicate-safe: re-adding the same event does not duplicate it', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      await store.update(app, (current) => [...current, stock()]);
      expect(await store.list(app)).toEqual([stock()]);
    });

    it('rejects a same-ID different-content transform result with CONFLICTING_EVENT and commits nothing', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      const before = await store.list(app);
      await expectRejectCode(
        () => store.update(app, (current) => [...current, stock(1, 99)]),
        'CONFLICTING_EVENT',
      );
      expect(await store.list(app)).toEqual(before);
    });

    it('rejects an invalid transform result with INVALID_EVENT and commits nothing', async () => {
      const store = makeStore();
      await store.update(app, () => [stock()]);
      const before = await store.list(app);
      await expectRejectCode(
        () => store.update(app, (current) => [...current, { ...stock(2), data: { productId: 'x', quantityDelta: 0 } }]),
        'INVALID_EVENT',
      );
      expect(await store.list(app)).toEqual(before);
    });

    it('serializes concurrent updates without losing events', async () => {
      const store = makeStore();
      await Promise.all(Array.from({ length: 20 }, (_, i) => store.update(app, (current) => [...current, stock(i)])));
      expect(await store.list(app)).toHaveLength(20);
    });

    it('maps adapter failures to STORAGE_FAILED with a safe message and no internal details', async () => {
      const sensitive = 'sensitive internal connection details';
      const failing: EventStore = {
        async list() { throw new Error(sensitive); },
        async update() { throw new Error(sensitive); },
      };
      const listError: unknown = await failing.list(app).catch((caught: unknown) => caught);
      const mapped = mapStorageError(listError);
      expect(mapped).toBeInstanceOf(CarrySyncError);
      expect(mapped.code).toBe('STORAGE_FAILED');
      expect(mapped.message).not.toContain(sensitive);
      const updateError: unknown = await failing.update(app, () => []).catch((caught: unknown) => caught);
      expect(mapStorageError(updateError).code).toBe('STORAGE_FAILED');
      // Domain CarrySyncErrors pass through mapStorageError unchanged.
      const conflict = new CarrySyncError('CONFLICTING_EVENT', 'conflict');
      expect(mapStorageError(conflict)).toBe(conflict);
    });
  });
}
