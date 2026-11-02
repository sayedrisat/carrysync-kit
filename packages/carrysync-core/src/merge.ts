import { type ApplicationId, type SyncEvent, validateEvent } from './events.js';
import { CarrySyncError } from './errors.js';

/** Stable key order; array order remains semantically significant. Only use with validated JSON values. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export interface MergeResult {
  events: SyncEvent[];
  added: number;
  duplicates: number;
}

/** Set union for compatible events. Same ID + different validated content rejects the whole batch. */
export function mergeEvents(app: ApplicationId, current: readonly unknown[], incoming: readonly unknown[]): MergeResult {
  const byId = new Map<string, SyncEvent>();
  const insert = (raw: unknown): boolean => {
    const event = validateEvent(raw, app);
    const existing = byId.get(event.id);
    if (existing && canonicalJson(existing) !== canonicalJson(event)) {
      throw new CarrySyncError('CONFLICTING_EVENT', 'An event ID has different content; the entire operation was rejected.');
    }
    byId.set(event.id, event);
    return !existing;
  };
  current.forEach(insert);
  let added = 0;
  let duplicates = 0;
  for (const event of incoming) {
    if (insert(event)) added++;
    else duplicates++;
  }
  return {
    events: [...byId.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    added, duplicates,
  };
}
