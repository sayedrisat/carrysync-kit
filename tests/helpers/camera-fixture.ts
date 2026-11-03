import type { CameraState, TransferState } from '@carrysync/camera';
import type { SyncEvent } from '@carrysync/core';
import { chromium, type Page, type BrowserContext } from '@playwright/test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';

declare global {
  interface Window {
    cameraHarness: {
      cameraState(): CameraState; transferState(): TransferState;
      events(): Promise<SyncEvent[]>; dispose(): void; deviceId(): Promise<string>;
    };
    cameraTracks: MediaStreamTrack[];
  }
}
/** Synthesized grayscale QR video, not physical-camera/two-phone evidence. */
export async function withCamera(text: string, run: (page: Page, context: BrowserContext, requests: string[]) => Promise<void>, allowedOrigin = 'http://127.0.0.1:5176') {
  const directory = await mkdtemp(join(tmpdir(), 'carrysync-camera-fixture-'));
  const movie = join(directory, 'qr.y4m');
  const png = PNG.sync.read(await QRCode.toBuffer(text, { type: 'png', width: 520, margin: 4, errorCorrectionLevel: 'M' }));
  const size = 640;
  const luminance = Buffer.alloc(size * size, 235);
  const offset = Math.floor((size - png.width) / 2);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const red = png.data[(y * png.width + x) * 4] ?? 255;
      luminance[(y + offset) * size + x + offset] = Math.round(16 + red * 219 / 255);
    }
  }
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luminance, Buffer.alloc(size * size / 2, 128)]);
  await writeFile(movie, Buffer.concat([Buffer.from(`YUV4MPEG2 W${size} H${size} F10:1 Ip A1:1 C420jpeg\n`), ...Array.from({ length: 10 }, () => frame)]));
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${movie}`],
  });
  try {
    const context = await browser.newContext({ permissions: ['camera'] });
    const requests: string[] = [];
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      requests.push(url);
      if (!url.startsWith(allowedOrigin + '/')) await route.abort();
      else await route.continue();
    });
    await context.addInitScript(() => {
      window.cameraTracks = [];
      const media = navigator.mediaDevices;
      if (!media?.getUserMedia) return;
      const original = media.getUserMedia.bind(media);
      media.getUserMedia = async (constraints) => {
        const stream = await original(constraints);
        window.cameraTracks.push(...stream.getTracks());
        return stream;
      };
    });
    await run(await context.newPage(), context, requests);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}
