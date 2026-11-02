import { CameraError } from './errors.js';

export interface QrFrameDecoder {
  detect(video: HTMLVideoElement): Promise<readonly { rawValue: string }[]>;
}

let initialized: { url: string; promise: Promise<void> } | undefined;

/** Lazy ponyfill import; the pure core and SSR module loading never request WASM or camera access. */
export async function createQrDecoder(wasmUrl: string): Promise<QrFrameDecoder> {
  try {
    const url = new URL(wasmUrl, location.href);
    if (url.origin !== location.origin || !['https:', 'http:'].includes(url.protocol)) throw new CameraError('DECODER_FAILED');
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    if (initialized && initialized.url !== url.href) throw new CameraError('DECODER_FAILED');
    if (!initialized) {
      const promise = prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => path.endsWith('.wasm') ? url.href : prefix + path },
        fireImmediately: true,
      }).then(() => undefined);
      initialized = { url: url.href, promise };
      void promise.catch(() => { initialized = undefined; });
    }
    await initialized.promise;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new CameraError('DECODER_FAILED');
    return {
      async detect(video) {
        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return detector.detect(canvas);
      },
    };
  } catch { throw new CameraError('DECODER_FAILED'); }
}
