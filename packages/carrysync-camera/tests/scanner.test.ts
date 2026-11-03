import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, InMemoryEventStore, serializeEvents, type AppEvent } from '@carrysync/core';
import { CameraScanner } from '../src/index.js';
import { createQrDecoder } from '../src/decoder.js';
import type { QrFrameDecoder } from '../src/decoder.js';

vi.mock('../src/decoder.js', () => ({ createQrDecoder: vi.fn() }));
const deviceId = '00000000-0000-4000-8000-000000000001';
const event: AppEvent<'field-ledger'> = {
  app: 'field-ledger', type: 'stock.moved', id: '10000000-0000-4000-8000-000000000001',
  deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId: 'rice', quantityDelta: 5 },
};
const payload = serializeEvents('field-ledger', [event]);
class Track extends EventTarget { stop = vi.fn(); }
let track: Track;
let stream: MediaStream;
let video: HTMLVideoElement;
let media: ReturnType<typeof vi.fn>;
let detect: ReturnType<typeof vi.fn<QrFrameDecoder['detect']>>;
let doc: EventTarget & { visibilityState: string };
let win: EventTarget;
const scanners: CameraScanner[] = [];
function scanner() {
  const instance = new CameraScanner({
    app: 'field-ledger', importer: createClient('field-ledger', new InMemoryEventStore(), deviceId), wasmUrl: '/decoder.wasm',
  });
  scanners.push(instance);
  return instance;
}
beforeEach(() => {
  vi.useFakeTimers();
  track = new Track();
  stream = { getTracks: () => [track] } as unknown as MediaStream;
  video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), readyState: 4, videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;
  media = vi.fn().mockResolvedValue(stream);
  detect = vi.fn<QrFrameDecoder['detect']>().mockResolvedValue([]);
  vi.mocked(createQrDecoder).mockResolvedValue({ detect });
  doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  win = new EventTarget();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: media } });
  vi.stubGlobal('isSecureContext', true);
});
afterEach(() => {
  scanners.splice(0).forEach((instance) => instance.dispose());
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('browser scanner lifecycle', () => {
  it('requests rear-facing video only, stops after one decoded QR and requires confirmation', async () => {
    const instance = scanner();
    detect.mockResolvedValue([{ rawValue: payload }]);
    expect(await instance.start(video)).toEqual({ state: 'scanning' });
    expect(media).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(detect).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(instance.imports.getState().state).toBe('review');
    expect((await instance.imports.confirmImport()).state).toBe('imported');
  });

  it.each([
    ['NotAllowedError', 'PERMISSION_DENIED'],
    ['NotFoundError', 'CAMERA_UNAVAILABLE'],
    ['NotReadableError', 'CAMERA_UNAVAILABLE'],
    ['UnexpectedError', 'CAMERA_FAILED'],
  ])('maps %s without leaking browser details', async (name, code) => {
    media.mockRejectedValue(new DOMException('private device label', name));
    expect(await scanner().start(video)).toMatchObject({ state: 'error', code });
  });

  it('rejects insecure/unsupported contexts before requesting a camera; manual fallback still works', async () => {
    vi.stubGlobal('isSecureContext', false);
    const instance = scanner();
    expect(await instance.start(video)).toMatchObject({ code: 'INSECURE_CONTEXT' });
    expect(instance.reviewText(payload).state).toBe('review');
    expect((await instance.imports.confirmImport()).state).toBe('imported');
    expect(media).not.toHaveBeenCalled();
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {});
    expect(await scanner().start(video)).toMatchObject({ code: 'CAMERA_UNSUPPORTED' });
  });

  it('single-flights starts and stops a late permission grant after cancellation', async () => {
    let grant: ((stream: MediaStream) => void) | undefined;
    media.mockImplementation(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
    const instance = scanner();
    const pending = instance.start(video);
    expect(instance.start(video)).toBe(pending);
    await Promise.resolve();
    instance.stop();
    grant?.(stream);
    expect(await pending).toEqual({ state: 'stopped' });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(createQrDecoder).not.toHaveBeenCalled();
  });

  it('does not request media when disposed synchronously from a requesting subscriber', async () => {
    const instance = scanner();
    instance.subscribe((state) => { if (state.state === 'requesting') instance.dispose(); });
    await instance.start(video);
    expect(media).not.toHaveBeenCalled();
    expect(instance.getState()).toEqual({ state: 'disposed' });
    expect(await instance.start(video)).toMatchObject({ code: 'SCANNER_DISPOSED' });
  });

  it('cleans streams on decoder and video playback failures', async () => {
    vi.mocked(createQrDecoder).mockRejectedValueOnce(new Error('private decoder path'));
    const a = scanner();
    expect((await a.start(video)).state).toBe('error');
    expect(track.stop).toHaveBeenCalledTimes(1);
    vi.mocked(video.play).mockRejectedValueOnce(new DOMException('autoplay', 'NotAllowedError'));
    expect((await scanner().start(video)).state).toBe('error');
    expect(track.stop).toHaveBeenCalledTimes(2);
  });

  it.each(['visibilitychange', 'pagehide', 'ended'])('releases tracks on %s', async (event) => {
    const instance = scanner();
    await instance.start(video);
    if (event === 'visibilitychange') { doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event(event)); }
    if (event === 'pagehide') win.dispatchEvent(new Event(event));
    if (event === 'ended') track.dispatchEvent(new Event(event));
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(detect).not.toHaveBeenCalled();
  });

  it('ignores an in-flight decode after disposal', async () => {
    let decoded: ((result: { rawValue: string }[]) => void) | undefined;
    detect.mockImplementation(() => new Promise((resolve) => { decoded = resolve; }));
    const instance = scanner();
    await instance.start(video);
    await vi.advanceTimersByTimeAsync(200);
    instance.dispose();
    decoded?.([{ rawValue: payload }]);
    await Promise.resolve();
    expect(instance.imports.getState()).toEqual({ state: 'idle' });
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it('cleans up while decoder initialization is pending and ignores its eventual result', async () => {
    let ready: ((decoder: QrFrameDecoder) => void) | undefined;
    vi.mocked(createQrDecoder).mockImplementation(() => new Promise((resolve) => { ready = resolve; }));
    const instance = scanner();
    const pending = instance.start(video);
    await Promise.resolve();
    await Promise.resolve();
    expect(video.srcObject).toBe(stream);
    instance.dispose();
    ready?.({ detect });
    expect(await pending).toEqual({ state: 'disposed' });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.play).not.toHaveBeenCalled();
  });

  it('releases its own tracks without detaching a stream now owned by another consumer', async () => {
    const instance = scanner();
    await instance.start(video);
    const otherStream = { getTracks: () => [] } as unknown as MediaStream;
    video.srcObject = otherStream;
    instance.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBe(otherStream);
  });

  it('does not schedule frames after a synchronous scanning subscriber stops it', async () => {
    const instance = scanner();
    instance.subscribe((state) => { if (state.state === 'scanning') instance.stop(); });
    await instance.start(video);
    await vi.advanceTimersByTimeAsync(1000);
    expect(detect).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it.each(['invalid', 'multiple', 'decoder-failed'])('stops safely for %s QR results', async (kind) => {
    if (kind === 'invalid') detect.mockResolvedValue([{ rawValue: 'not CarrySync' }]);
    if (kind === 'multiple') detect.mockResolvedValue([{ rawValue: payload }, { rawValue: payload }]);
    if (kind === 'decoder-failed') detect.mockRejectedValue(new Error('private decoder detail'));
    const instance = scanner();
    await instance.start(video);
    await vi.advanceTimersByTimeAsync(200);
    expect(track.stop).toHaveBeenCalledTimes(1);
    if (kind === 'invalid') expect(instance.imports.getState()).toMatchObject({ state: 'error', code: 'INVALID_PAYLOAD' });
    else expect(instance.getState()).toMatchObject({ state: 'error', code: kind === 'multiple' ? 'MULTIPLE_QR_CODES' : 'DECODER_FAILED' });
  });
});
