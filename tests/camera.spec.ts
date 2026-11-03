import { test, expect, type Page } from '@playwright/test';
import { withCamera } from './helpers/camera-fixture.js';
import { serializeEvents, type SyncEvent } from '@carrysync/core';

const origin = 'http://127.0.0.1:5176';
const deviceId = '00000000-0000-4000-8000-000000000001';
const stock: SyncEvent = {
  app: 'field-ledger', type: 'stock.moved', id: '30000000-0000-4000-8000-000000000001',
  deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId: 'camera-rice', quantityDelta: 5 },
};
const quiz: SyncEvent = {
  ...stock, app: 'quiz-relay', type: 'quiz.published',
  data: { quizId: 'camera-maths', title: 'Camera quiz', questions: [{ id: 'q1', prompt: '2 + 2?', options: ['3', '4'] }] },
};
const payload = serializeEvents('field-ledger', [stock]);
async function load(page: Page, app = 'field-ledger', db = crypto.randomUUID()) {
  await page.goto(`${origin}/?app=${app}&db=${db}`);
  await page.waitForFunction(() => !!window.cameraHarness);
}
async function manualReview(page: Page, text: string) {
  await page.getByLabel('Manual scanner text').fill(text);
  await page.getByRole('button', { name: 'Review text', exact: true }).click();
}


for (const event of [stock, quiz]) {
  test(`real WASM decoder reads synthetic live ${event.app} camera frames and imports only after confirmation`, async () => {
    await withCamera(serializeEvents(event.app, [event]), async (page, context, requests) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await load(page, event.app);
      await page.getByRole('button', { name: 'Start camera', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled({ timeout: 15000 });
      expect(await page.evaluate(() => window.cameraHarness.transferState())).toMatchObject({ state: 'review', envelope: { events: [event] } });
      expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([]);
      expect(await page.evaluate(() => window.cameraTracks.map((track) => track.readyState))).toEqual(['ended']);
      expect(await page.locator('video').evaluate((video) => video instanceof HTMLVideoElement ? video.srcObject : undefined)).toBeNull();
      expect(requests.some((url) => url.includes('.wasm'))).toBe(true);
      expect(requests.every((url) => url.startsWith(origin + '/'))).toBe(true);
      await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
      await expect(page.locator('#count')).toHaveText('1');
      expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([event]);
      const identity = await page.evaluate(() => window.cameraHarness.deviceId());
      await page.reload();
      await page.waitForFunction(() => !!window.cameraHarness);
      expect(await page.evaluate(() => window.cameraHarness.deviceId())).toBe(identity);
      await expect(page.locator('#count')).toHaveText('1');
      await page.getByRole('button', { name: 'Start camera', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
      await expect(page.locator('#transfer-status')).toContainText('duplicate: 0 added, 1 duplicate(s)');
      expect(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended'))).toBe(true);
      // Warm decoder/module, keep the page open, then disconnect browser networking. This
      // validates only an open-page offline flow, not PWA installation/reopening or real phones.
      const warmRequests = requests.length;
      await context.setOffline(true);
      await page.getByRole('button', { name: 'Start camera', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
      await expect(page.locator('#transfer-status')).toContainText('duplicate: 0 added, 1 duplicate(s)');
      expect(requests).toHaveLength(warmRequests);
      await context.setOffline(false);
      if (event.app === 'field-ledger') {
        const other = await context.newPage();
        await load(other, 'quiz-relay');
        await other.getByRole('button', { name: 'Start camera', exact: true }).click();
        await expect(other.locator('#transfer-status')).toContainText('WRONG_APPLICATION');
        expect(await other.evaluate(() => window.cameraHarness.events())).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  });
}

for (const [text, code] of [
  ['This is not a CarrySync payload', 'INVALID_PAYLOAD'],
  ['x'.repeat(1201), 'PAYLOAD_TOO_LARGE'],
] as const) {
test(`live QR rejection ${code} releases all camera tracks`, async () => {
  await withCamera(text, async (page) => {
    await load(page);
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await expect(page.locator('#transfer-status')).toContainText(code, { timeout: 15000 });
    expect(await page.evaluate(() => window.cameraTracks.map((track) => track.readyState))).toEqual(['ended']);
    expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([]);
  });
});
}

test('decoder network failure releases the camera and a later explicit retry succeeds', async () => {
  await withCamera(payload, async (page, context) => {
    await load(page);
    const wasm = /\.wasm(?:\?|$)/;
    await context.route(wasm, (route) => route.abort());
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await expect(page.locator('#camera-status')).toContainText('DECODER_FAILED');
    expect(await page.evaluate(() => window.cameraTracks.map((track) => track.readyState))).toEqual(['ended']);
    await context.unroute(wasm);
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled({ timeout: 15000 });
    await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(page.locator('#count')).toHaveText('1');
    expect(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended'))).toBe(true);
  });
});

test('manual fallback uses persistent core imports, with invalid/version/conflict states and cancel', async ({ page }) => {
  await load(page);
  await manualReview(page, payload);
  await page.getByRole('button', { name: 'Cancel review', exact: true }).click();
  expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([]);
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeDisabled();
  await manualReview(page, payload);
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.locator('#count')).toHaveText('1');
  for (const [text, code] of [
    ['{', 'INVALID_PAYLOAD'],
    ['x'.repeat(1201), 'PAYLOAD_TOO_LARGE'],
    [payload.replace('"version":1', '"version":2'), 'UNSUPPORTED_VERSION'],
  ]) {
    await manualReview(page, text ?? '');
    await expect(page.locator('#transfer-status')).toContainText(code ?? '');
    await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeDisabled();
  }
  await manualReview(page, serializeEvents('field-ledger', [{ ...stock, data: { productId: 'camera-rice', quantityDelta: 99 } } as SyncEvent]));
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.locator('#transfer-status')).toContainText('CONFLICTING_EVENT');
  expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([stock]);
  // A valid compact wire input can fit the byte limit although canonical re-export grows.
  // The optional manual-field copy must not prevent review/confirmation of the original text.
  const compact = JSON.stringify({
    protocol: 'carrysync', version: 1, app: 'field-ledger',
    events: Array.from({ length: 4 }, (_, index) => ({
      ...stock, id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      data: { productId: 'x'.repeat(59), quantityDelta: 1000000 },
    })),
  }).replaceAll(':1000000', ':1e6');
  expect(Buffer.byteLength(compact)).toBe(1188);
  await manualReview(page, compact);
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.locator('#count')).toHaveText('5');
});

for (const [name, code] of [['NotAllowedError', 'PERMISSION_DENIED'], ['NotFoundError', 'CAMERA_UNAVAILABLE']] as const) {
  test(`simulated ${name} exposes a safe state and retains manual fallback`, async ({ page }) => {
    await page.addInitScript((name) => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('private browser/device details', name); };
    }, name);
    await load(page);
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await expect(page.locator('#camera-status')).toContainText(code);
    await expect(page.locator('#camera-status')).not.toContainText('private browser');
    await manualReview(page, payload);
    await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(page.locator('#count')).toHaveText('1');
  });
}

test('plain JavaScript harness generates a selected public SDK QR and stays usable at a narrow viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await load(page);
  await page.getByRole('button', { name: 'Create sample event', exact: true }).click();
  await page.getByRole('button', { name: 'Generate selected QR', exact: true }).click();
  await expect(page.getByAltText('CarrySync transfer QR')).toBeVisible();
  await manualReview(page, await page.getByLabel('Export scanner text').inputValue());
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.locator('#transfer-status')).toContainText('duplicate');
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
