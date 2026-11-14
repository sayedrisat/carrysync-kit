import {
  MAX_ENVELOPE_EVENTS, MAX_PAYLOAD_BYTES, PROTOCOL_VERSION,
  canonicalJson, mergeEvents, payloadByteLength,
  type ApplicationId, type QrExport, type SyncEvent,
} from '@carrysync/core';
import { DomainError } from './errors.js';
import { sortChronologically } from './shared.js';

export interface ExportOptions {
  /** Per-QR UTF-8 byte budget, 1..1200. Lower values give less dense, easier-to-scan codes. */
  maxBytes?: number;
}

export interface ExportMeasurement {
  /** Exact UTF-8 length of the v1 payload `serializeEvents` would produce. */
  bytes: number;
  eventCount: number;
  limit: number;
  fits: boolean;
}

export interface ExportBatch {
  index: number;
  events: SyncEvent[];
  eventCount: number;
  bytes: number;
}

export interface ExportPlan {
  batches: ExportBatch[];
  totalEvents: number;
  limit: number;
}

/** One rendered QR within a multi-code transfer. Each batch is an independent, atomic v1 envelope. */
export interface QrBatch extends QrExport {
  index: number;
  total: number;
}

function resolveLimit(maxBytes: number | undefined): number {
  if (maxBytes === undefined) return MAX_PAYLOAD_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_PAYLOAD_BYTES) {
    throw new DomainError('INVALID_INPUT', { field: 'maxBytes', limit: MAX_PAYLOAD_BYTES });
  }
  return maxBytes;
}

function measureUnique(app: ApplicationId, unique: readonly SyncEvent[], limit: number): ExportMeasurement {
  const payload = canonicalJson({ protocol: 'carrysync', version: PROTOCOL_VERSION, app, events: unique });
  const bytes = payloadByteLength(payload);
  return { bytes, eventCount: unique.length, limit, fits: bytes <= limit && unique.length <= MAX_ENVELOPE_EVENTS };
}

/**
 * Non-throwing size check for a selection (still throws for invalid, conflicting or wrong-app events).
 * Identical duplicates are counted once, exactly like `serializeEvents`.
 */
export function measureExport(app: ApplicationId, events: readonly SyncEvent[], options: ExportOptions = {}): ExportMeasurement {
  const limit = resolveLimit(options.maxBytes);
  const unique = mergeEvents(app, [], events).events;
  if (unique.length === 0) throw new DomainError('EMPTY_SELECTION');
  return measureUnique(app, unique, limit);
}

/**
 * Splits a selection into the fewest consecutive chronological QR batches that fit the budget.
 * Deterministic for any input order. A single event over budget throws EVENT_TOO_LARGE (no truncation).
 */
export function planExportBatches(app: ApplicationId, events: readonly SyncEvent[], options: ExportOptions = {}): ExportPlan {
  const limit = resolveLimit(options.maxBytes);
  const ordered = sortChronologically(mergeEvents(app, [], events).events);
  if (ordered.length === 0) throw new DomainError('EMPTY_SELECTION');
  const batches: ExportBatch[] = [];
  let current: SyncEvent[] = [];
  let currentBytes = 0;
  const flush = () => {
    batches.push({ index: batches.length, events: current, eventCount: current.length, bytes: currentBytes });
  };
  for (const event of ordered) {
    const single = measureUnique(app, [event], limit);
    if (!single.fits) throw new DomainError('EVENT_TOO_LARGE', { eventId: event.id, bytes: single.bytes, limit });
    if (current.length > 0) {
      const candidate = measureUnique(app, [...current, event], limit);
      if (candidate.fits) {
        current = [...current, event];
        currentBytes = candidate.bytes;
        continue;
      }
      flush();
    }
    current = [event];
    currentBytes = single.bytes;
  }
  flush();
  return { batches, totalEvents: ordered.length, limit };
}

/** Renders every planned batch with the client's existing `prepareExport` (core v1 QR rendering). */
export async function renderExportPlan(
  client: { prepareExport(events: readonly SyncEvent[]): Promise<QrExport> },
  plan: ExportPlan,
): Promise<QrBatch[]> {
  const rendered: QrBatch[] = [];
  for (const batch of plan.batches) {
    rendered.push({ ...(await client.prepareExport(batch.events)), index: batch.index, total: plan.batches.length });
  }
  return rendered;
}
