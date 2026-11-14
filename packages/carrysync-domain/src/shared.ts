import type { SyncEvent } from '@carrysync/core';

/** Deterministic chronological order: parsed timestamp, then event ID. Clocks are informational only. */
export function compareChronological(a: { createdAt: string; id: string }, b: { createdAt: string; id: string }): number {
  const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (delta !== 0) return delta;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Returns a new chronologically sorted array; the accepted set itself is ID-sorted. */
export function sortChronologically<E extends { createdAt: string; id: string }>(events: readonly E[]): E[] {
  return [...events].sort(compareChronological);
}

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function eventsOfType<T extends SyncEvent['type']>(events: readonly SyncEvent[], type: T): Extract<SyncEvent, { type: T }>[] {
  return events.filter((event): event is Extract<SyncEvent, { type: T }> => event.type === type);
}

export type Unsubscribe = () => void;

/** Tiny synchronous notifier: listener failures never affect domain or storage correctness. */
export function createChangeEmitter() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void): Unsubscribe {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    emit(): void {
      for (const listener of [...listeners]) {
        try { listener(); } catch { /* UI callbacks cannot change domain state. */ }
      }
    },
  };
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
