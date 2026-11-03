import type { ApplicationId } from '@carrysync/core';
import { createQrDecoder, type QrFrameDecoder } from './decoder.js';
import { CameraError, cameraError, type CameraErrorCode } from './errors.js';
import { QrImportSession, type PayloadImporter, type TransferState } from './import-session.js';

export type CameraState =
  | { state: 'idle' | 'requesting' | 'scanning' | 'stopped' | 'disposed' }
  | { state: 'error'; code: CameraErrorCode; message: string };
export interface CameraScannerOptions {
  app: ApplicationId;
  importer: PayloadImporter;
  /** Same-origin URL to the exported decoder.wasm asset; bundle or serve it with the application. */
  wasmUrl: string;
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch { /* Continue releasing the remaining owned tracks. */ }
  }
}

/** One-shot scanning: a decoded QR stops the camera and requires explicit review + confirmation. */
export class CameraScanner {
  readonly imports: QrImportSession;
  private status: CameraState = { state: 'idle' };
  private readonly listeners = new Set<(state: CameraState) => void>();
  private generation = 0;
  private disposed = false;
  private operation: Promise<CameraState> | undefined;
  private stream: MediaStream | undefined;
  private video: HTMLVideoElement | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onHidden = () => { if (document.visibilityState === 'hidden') this.stop(); };
  private readonly onPageHide = () => this.stop();
  private readonly onEnded = () => this.fail(new CameraError('CAMERA_UNAVAILABLE'));

  constructor(private readonly options: CameraScannerOptions) {
    this.imports = new QrImportSession(options.app, options.importer);
  }
  getState(): CameraState { return structuredClone(this.status); }
  subscribe(listener: (state: CameraState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private publish(state: CameraState): void {
    this.status = state;
    for (const listener of this.listeners) {
      try { listener(this.getState()); } catch { /* UI callbacks must not leak camera resources. */ }
    }
  }
  private release(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onHidden);
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this.onPageHide);
    const ownedStream = this.stream;
    if (ownedStream) {
      for (const track of ownedStream.getTracks()) track.removeEventListener('ended', this.onEnded);
      stopTracks(ownedStream);
    }
    this.stream = undefined;
    if (this.video && this.video.srcObject === ownedStream) {
      try { this.video.pause(); } catch { /* Detached video can already be stopped. */ }
      this.video.srcObject = null;
    }
    this.video = undefined;
  }
  stop(): void {
    ++this.generation;
    this.release();
    if (!this.disposed) this.publish({ state: 'stopped' });
  }
  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.imports.clear();
    this.publish({ state: 'disposed' });
    this.listeners.clear();
  }
  private fail(error: CameraError): void {
    this.stop();
    if (!this.disposed) this.publish({ state: 'error', code: error.code, message: error.message });
  }
  reviewText(payload: string): TransferState {
    this.stop();
    return this.imports.reviewText(payload);
  }
  start(video: HTMLVideoElement): Promise<CameraState> {
    if (this.disposed) return Promise.resolve({ state: 'error', code: 'SCANNER_DISPOSED', message: new CameraError('SCANNER_DISPOSED').message });
    if (this.operation) return this.operation;
    if (this.status.state === 'scanning') return Promise.resolve(this.getState());
    if (this.imports.getState().state === 'importing') {
      this.fail(new CameraError('IMPORT_BUSY'));
      return Promise.resolve(this.getState());
    }
    this.imports.clear();
    const generation = ++this.generation;
    this.operation = Promise.resolve().then(() => this.open(video, generation)).finally(() => { this.operation = undefined; });
    this.publish({ state: 'requesting' });
    return this.operation;
  }
  private async open(video: HTMLVideoElement, generation: number): Promise<CameraState> {
    const active = () => !this.disposed && generation === this.generation;
    try {
      if (!active()) return this.getState();
      if (!globalThis.isSecureContext) throw new CameraError('INSECURE_CONTEXT');
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw new CameraError('CAMERA_UNSUPPORTED');
      document.addEventListener('visibilitychange', this.onHidden);
      window.addEventListener('pagehide', this.onPageHide);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } },
      });
      if (!active()) { stopTracks(stream); return this.getState(); }
      this.stream = stream;
      this.video = video;
      for (const track of stream.getTracks()) track.addEventListener('ended', this.onEnded);
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      const decoder = await createQrDecoder(this.options.wasmUrl);
      if (!active()) return this.getState();
      await video.play();
      if (!active()) return this.getState();
      this.publish({ state: 'scanning' });
      if (active()) this.schedule(video, decoder, generation);
    } catch (error) {
      if (active()) this.fail(cameraError(error));
    }
    return this.getState();
  }
  private schedule(video: HTMLVideoElement, decoder: QrFrameDecoder, generation: number): void {
    this.timer = setTimeout(() => { void this.frame(video, decoder, generation); }, 200);
  }
  private async frame(video: HTMLVideoElement, decoder: QrFrameDecoder, generation: number): Promise<void> {
    const active = () => !this.disposed && generation === this.generation;
    if (!active()) return;
    try {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const results = await decoder.detect(video);
        if (!active()) return;
        if (results.length > 1) { this.fail(new CameraError('MULTIPLE_QR_CODES')); return; }
        const result = results[0];
        if (result) { this.reviewText(result.rawValue); return; }
      }
      if (active()) this.schedule(video, decoder, generation);
    } catch {
      if (active()) this.fail(new CameraError('DECODER_FAILED'));
    }
  }
}
