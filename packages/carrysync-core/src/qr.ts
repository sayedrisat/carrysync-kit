import QRCode from 'qrcode';
import { type ApplicationId, type SyncEvent } from './events.js';
import { CarrySyncError } from './errors.js';
import { deserializePayload, payloadByteLength, serializeEvents } from './protocol.js';

export interface QrExport {
  payload: string;
  svg: string;
  bytes: number;
  eventCount: number;
}

/** Review selected events before displaying the returned QR: payloads are plaintext. */
export async function encodeQrPayload(app: ApplicationId, events: readonly SyncEvent[]): Promise<QrExport> {
  const payload = serializeEvents(app, events);
  try {
    const svg = await QRCode.toString([{ data: new TextEncoder().encode(payload), mode: 'byte' }], {
      type: 'svg', errorCorrectionLevel: 'M', margin: 4,
    });
    return { payload, svg, bytes: payloadByteLength(payload), eventCount: deserializePayload(payload, app).events.length };
  } catch (error) {
    if (error instanceof CarrySyncError) throw error;
    throw new CarrySyncError('QR_GENERATION_FAILED', 'Could not render the selected QR payload.');
  }
}

/** Accepts text from a scanner, not camera frames or image pixels. */
export const decodeQrPayload = deserializePayload;
