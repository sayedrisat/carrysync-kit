import { expect, test, chromium, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serializeEvents, type SyncEvent } from '@carrysync/core';
import { withCamera } from './helpers/camera-fixture.js';

const base = new URL(process.env.CARRYSYNC_TEST_URL || 'http://127.0.0.1:5177/carrysync-kit/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const key = 'carrysync-camera.application.v1';
async function open(page: Page) {
  const url = new URL(base);
  url.searchParams.set('db', 'offline-test-' + crypto.randomUUID());
  await page.goto(url.href);
  await initialized(page);
}
async function initialized(page: Page) {
  await page.waitForFunction(() => !!window.cameraHarness);
  await expect(page.locator('#initialization')).toContainText('Persistent storage ready');
}
async function ready(page: Page) {
  await expect(page.locator('#offline-status')).toContainText('Ready for Offline Use', { timeout: 40000 });
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
}
async function choose(page: Page, app: string) {
  await page.locator('#app').selectOption(app);
  await expect(page.locator('#app')).toBeEnabled();
}

for (const app of ['quiz-relay', 'field-ledger']) {
  test(`${app} selection survives reload and event stores remain isolated`, async ({ page }) => {
    await open(page);
    const id = await page.locator('#device-id').textContent();
    // Leave records in both app namespaces, then restore the requested one.
    await choose(page, app === 'quiz-relay' ? 'field-ledger' : 'quiz-relay');
    await page.locator('#sample').click();
    await expect(page.locator('#count')).toHaveText('1');
    const other = await page.evaluate(() => window.cameraHarness.events());
    await choose(page, app);
    await expect(page.locator('#count')).toHaveText('0');
    await page.locator('#sample').click();
    await expect(page.locator('#count')).toHaveText('1');
    const events = await page.evaluate(() => window.cameraHarness.events());
    await page.reload();
    await initialized(page);
    await expect(page.locator('#app')).toHaveValue(app);
    expect(await page.evaluate(() => window.cameraHarness.events())).toEqual(events);
    await expect(page.locator('#device-id')).toHaveText(id!);
    await choose(page, app === 'quiz-relay' ? 'field-ledger' : 'quiz-relay');
    expect(await page.evaluate(() => window.cameraHarness.events())).toEqual(other);
  });
}

test('invalid stored selection falls back to FieldLedger; URL override is consumed once', async ({ page }) => {
  await open(page);
  await page.evaluate((key) => localStorage.setItem(key, 'invalid-app'), key);
  await page.reload(); await initialized(page);
  await expect(page.locator('#app')).toHaveValue('field-ledger');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('field-ledger');
  const url = new URL(page.url()); url.searchParams.set('app', 'quiz-relay');
  await page.goto(url.href); await initialized(page);
  await expect(page.locator('#app')).toHaveValue('quiz-relay');
  await choose(page, 'field-ledger'); await page.reload(); await initialized(page);
  await expect(page.locator('#app')).toHaveValue('field-ledger');
});

test('disabled preference storage keeps the harness usable and reports unsaved selection', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Disabled', 'SecurityError'); };
    Storage.prototype.getItem = () => { throw new DOMException('Disabled', 'SecurityError'); };
  });
  await open(page);
  await expect(page.locator('#app')).toHaveValue('field-ledger');
  await expect(page.locator('#selection-status')).toContainText('could not be saved');
  await choose(page, 'quiz-relay');
  await page.locator('#sample').click();
  await expect(page.locator('#count')).toHaveText('1');
});

test('complete installed shell supports offline reload, QR generation/import, identity and allowlisted caches', async ({ page, context }) => {
  await open(page); await choose(page, 'quiz-relay'); await ready(page);
  await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('1');
  const events = await page.evaluate(() => window.cameraHarness.events());
  const id = await page.locator('#device-id').textContent();
  const cached = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith('carrysync-camera-shell:'));
    return (await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((request) => request.url)))).flat().sort();
  });
  expect(cached.some((url) => url.endsWith('.wasm'))).toBe(true);
  expect(cached.some((url) => /ponyfill.*\.js$/.test(url))).toBe(true);
  expect(cached.some((url) => url.endsWith('manifest.webmanifest'))).toBe(true);
  expect(cached.some((url) => url.endsWith('icon-512.png'))).toBe(true);
  expect(cached.every((url) => new URL(url).origin === base.origin && !new URL(url).search)).toBe(true);
  await context.setOffline(true);
  // New navigation, not an already-open-page assertion.
  await page.reload(); await initialized(page); await ready(page);
  await expect(page.locator('#app')).toHaveValue('quiz-relay');
  expect(await page.evaluate(() => window.cameraHarness.events())).toEqual(events);
  await expect(page.locator('#device-id')).toHaveText(id!);
  await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('2');
  await page.locator('#export').click();
  await expect(page.getByAltText('CarrySync transfer QR')).toBeVisible();
  const payload = await page.locator('#export-text').inputValue();
  const envelope = JSON.parse(payload) as { events: SyncEvent[] };
  envelope.events[0]!.id = crypto.randomUUID();
  await page.locator('#manual').fill(JSON.stringify(envelope));
  await page.locator('#review').click(); await page.locator('#confirm').click();
  await expect(page.locator('#count')).toHaveText('3');
  const after = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith('carrysync-camera-shell:'));
    return (await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((request) => request.url)))).flat().sort();
  });
  expect(after).toEqual(cached); // No event/QR/runtime request was added to the shell cache.
  const url = page.url(); await page.close();
  const reopened = await context.newPage(); await reopened.goto(url); await initialized(reopened); await ready(reopened);
  await expect(reopened.locator('#count')).toHaveText('3');
  await expect(reopened.locator('#device-id')).toHaveText(id!);
  await context.setOffline(false);
});

test('closed browser profile reopens offline with selected app, events, UUID and activated worker', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'carrysync-offline-profile-'));
  let context = await chromium.launchPersistentContext(directory, { channel: 'chrome', headless: true });
  try {
    let page = context.pages()[0]!;
    await open(page); await choose(page, 'quiz-relay'); await ready(page);
    await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('1');
    const events = await page.evaluate(() => window.cameraHarness.events());
    const id = await page.locator('#device-id').textContent();
    const url = page.url();
    await context.close();
    // Networking disabled at browser-context creation, before the first navigation.
    context = await chromium.launchPersistentContext(directory, { channel: 'chrome', headless: true, offline: true });
    page = context.pages()[0]!;
    await page.goto(url); await initialized(page); await ready(page);
    await expect(page.locator('#app')).toHaveValue('quiz-relay');
    expect(await page.evaluate(() => window.cameraHarness.events())).toEqual(events);
    await expect(page.locator('#device-id')).toHaveText(id!);
    await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('2');
    await page.locator('#export').click(); await expect(page.getByAltText('CarrySync transfer QR')).toBeVisible();
  } finally { await context.close(); await rm(directory, { recursive: true, force: true }); }
});

for (const app of ['field-ledger', 'quiz-relay'] as const) {
  test(`${app} camera decodes actual cached WASM after offline reload without warming decoder`, async () => {
    const stock: SyncEvent = {
      app: 'field-ledger', type: 'stock.moved', id: '60000000-0000-4000-8000-000000000001',
      deviceId: '00000000-0000-4000-8000-000000000001', createdAt: '2026-11-03T00:00:00.000Z',
      data: { productId: 'offline-rice', quantityDelta: 5 },
    };
    const event: SyncEvent = app === 'field-ledger' ? stock : {
      ...stock, app, type: 'quiz.published', data: { quizId: 'offline-quiz', title: 'Offline quiz', questions: [{ id: 'q1', prompt: '2+2?', options: ['3', '4'] }] },
    };
    await withCamera(serializeEvents(app, [event]), async (page, context) => {
      await open(page); await choose(page, app); await ready(page);
      await context.setOffline(true);
      await page.reload(); await initialized(page); await ready(page);
      const response = page.waitForResponse((response) => response.url().endsWith('.wasm'));
      await page.locator('#start').click();
      await expect(page.locator('#confirm')).toBeEnabled({ timeout: 20000 });
      expect((await response).fromServiceWorker()).toBe(true);
      expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([]);
      expect(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended'))).toBe(true);
      await page.locator('#confirm').click(); await expect(page.locator('#count')).toHaveText('1');
      expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([event]);
      await context.setOffline(false);
    }, base.origin);
  });
}

test('cache eviction revokes ready status and online retry repairs it without deleting records or identity', async ({ page, context }) => {
  await open(page); await ready(page);
  await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('1');
  const id = await page.locator('#device-id').textContent();
  await page.evaluate(async () => {
    for (const name of await caches.keys()) if (name.startsWith('carrysync-camera-shell:')) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) if (request.url.endsWith('.wasm')) await cache.delete(request);
    }
  });
  await context.setOffline(true);
  await page.locator('#offline-retry').click();
  await expect(page.locator('#offline-status')).toContainText('unavailable or incomplete');
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('#device-id')).toHaveText(id!);
  await context.setOffline(false);
  await expect(page.locator('#offline-retry')).toBeEnabled();
  await page.locator('#offline-retry').click();
  await ready(page);
});
