import { z } from 'zod';
import { applicationSchema, eventSchema, type ApplicationId, type SyncEvent } from './events.js';
import { CarrySyncError } from './errors.js';
import { canonicalJson, mergeEvents } from './merge.js';

export const PROTOCOL_VERSION = 1;
export const MAX_PAYLOAD_BYTES = 1200;
export const MAX_ENVELOPE_EVENTS = 20;

const envelopeSchema = z.strictObject({
  protocol: z.literal('carrysync'),
  version: z.literal(PROTOCOL_VERSION),
  app: applicationSchema,
  events: z.array(eventSchema).min(1).max(MAX_ENVELOPE_EVENTS),
});
export type Envelope = z.infer<typeof envelopeSchema>;

export function payloadByteLength(payload: string): number {
  return new TextEncoder().encode(payload).byteLength;
}

function checkSize(payload: string): void {
  // UTF-16 length provides a cheap guard before allocating the encoded byte array.
  if (payload.length > MAX_PAYLOAD_BYTES || payloadByteLength(payload) > MAX_PAYLOAD_BYTES) {
    throw new CarrySyncError('PAYLOAD_TOO_LARGE', `QR payload exceeds ${MAX_PAYLOAD_BYTES} UTF-8 bytes. Select fewer events.`);
  }
}

function validateEnvelope(value: unknown, app: ApplicationId): Envelope {
  if (value !== null && typeof value === 'object' && 'version' in value && value.version !== PROTOCOL_VERSION) {
    throw new CarrySyncError('UNSUPPORTED_VERSION', 'Only CarrySync payload version 1 is supported.');
  }
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) throw new CarrySyncError('INVALID_PAYLOAD', 'Payload does not match the CarrySync v1 envelope.');
  if (parsed.data.app !== app) throw new CarrySyncError('WRONG_APPLICATION', 'Payload belongs to another application.');
  return { ...parsed.data, events: mergeEvents(app, [], parsed.data.events).events };
}

export function serializeEvents(app: ApplicationId, events: readonly SyncEvent[]): string {
  const envelope = validateEnvelope({ protocol: 'carrysync', version: PROTOCOL_VERSION, app, events }, app);
  const payload = canonicalJson(envelope);
  checkSize(payload);
  return payload;
}

export function deserializePayload(payload: string, app: ApplicationId): Envelope {
  if (typeof payload !== 'string') throw new CarrySyncError('INVALID_PAYLOAD', 'QR payload must be text.');
  checkSize(payload);
  let raw: unknown;
  try { raw = JSON.parse(payload); }
  catch { throw new CarrySyncError('INVALID_PAYLOAD', 'QR payload is not valid JSON.'); }
  return validateEnvelope(raw, app);
}
