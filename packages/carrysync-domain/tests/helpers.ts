import { createClient, InMemoryEventStore, type AppEvent, type ApplicationId } from '@carrysync/core';

export const deviceA = '00000000-0000-4000-8000-00000000000a';
export const deviceB = '00000000-0000-4000-8000-00000000000b';
export const deviceC = '00000000-0000-4000-8000-00000000000c';

export const uuid = (index: number, prefix = '1') => `${prefix}0000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
export const at = (minute: number) => new Date(Date.UTC(2026, 10, 14, 8, minute)).toISOString();

export function stock(index: number, productId: string, quantityDelta: number, options: { minute?: number; deviceId?: string } = {}): AppEvent<'field-ledger'> {
  return {
    app: 'field-ledger', type: 'stock.moved', id: uuid(index), deviceId: options.deviceId ?? deviceA,
    createdAt: at(options.minute ?? index), data: { productId, quantityDelta },
  };
}

export function memoryClient<A extends ApplicationId>(app: A, deviceId: string) {
  return createClient(app, new InMemoryEventStore(), deviceId);
}

/** Deterministic Fisher–Yates shuffle for order-independence checks. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items];
  let state = seed >>> 0 || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}
