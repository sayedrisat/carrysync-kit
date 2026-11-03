import { expect, test, type Page } from '@playwright/test';
import { serializeEvents, type SyncEvent } from '@carrysync/core';
import { withCamera } from './helpers/camera-fixture.js';

const base = new URL(process.env.CARRYSYNC_TEST_URL || 'http://127.0.0.1:5177/carrysync-kit/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const stock: SyncEvent = {
  app: 'field-ledger', type: 'stock.moved', id: '50000000-0000-4000-8000-000000000001',
  deviceId: '00000000-0000-4000-8000-000000000001', createdAt: '2026-11-03T00:00:00.000Z',
  data: { productId: 'static-demo-rice', quantityDelta: 5 },
};
const quiz: SyncEvent = {
  ...stock, app: 'quiz-relay', type: 'quiz.published',
  data: { quizId: 'static-maths', title: 'Static quiz', questions: [{ id: 'q1', prompt: '2 + 2?', options: ['3', '4'] }] },
};
async function load(page: Page, app = 'field-ledger') {
  const url = new URL(base);
  url.searchParams.set('app', app);
  url.searchParams.set('db', 'static-test-' + crypto.randomUUID());
  await page.goto(url.href);
  await page.waitForFunction(() => !!window.cameraHarness);
}

test('production subpath loads metadata/notices/JS, persists manual import and stays same-origin', async ({ page }) => {
  const errors: string[] = [];
  const urls: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => urls.push(request.url()));
  page.on('requestfailed', (request) => errors.push('Request failed: ' + request.url()));
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== base.origin) { errors.push('Unexpected foreign origin'); await route.abort(); }
    else await route.continue();
  });
  await load(page);
  expect(await page.evaluate(() => isSecureContext)).toBe(true);
  const metadata = await page.request.get(new URL('build-info.json', base).href);
  expect(metadata.ok()).toBe(true);
  const build = await metadata.json() as { commit: string };
  expect(build.commit).toMatch(/^(?:local-unversioned|[0-9a-f]{40})$/);
  if (process.env.CARRYSYNC_EXPECTED_SHA) expect(build.commit).toBe(process.env.CARRYSYNC_EXPECTED_SHA);
  await expect(page.locator('#build-commit')).toHaveText(build.commit);
  const notices = page.locator('#decoder-notices');
  const link = await notices.getAttribute('href');
  expect(link).toBeTruthy();
  const noticeUrl = new URL(link ?? '', page.url());
  expect(noticeUrl.origin).toBe(base.origin);
  expect(noticeUrl.pathname.startsWith(base.pathname)).toBe(true);
  const noticeResponse = await page.request.get(noticeUrl.href);
  expect(noticeResponse.ok()).toBe(true);
  expect(await noticeResponse.text()).toContain('Apache License');
  await page.getByLabel('Manual scanner text').fill(serializeEvents('field-ledger', [stock]));
  await page.getByRole('button', { name: 'Review text', exact: true }).click();
  expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([]);
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.locator('#count')).toHaveText('1');
  const id = await page.evaluate(() => window.cameraHarness.deviceId());
  await page.reload();
  await page.waitForFunction(() => !!window.cameraHarness);
  expect(await page.evaluate(() => window.cameraHarness.deviceId())).toBe(id);
  expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([stock]);
  expect(urls.filter((url) => new URL(url).protocol.startsWith('http')).every((url) => {
    const asset = new URL(url);
    return asset.origin === base.origin && asset.pathname.startsWith(base.pathname);
  })).toBe(true);
  expect(urls.some((url) => url.includes('/@vite/') || url.includes('/@fs/'))).toBe(false);
  expect(errors).toEqual([]);
});

for (const event of [stock, quiz]) {
  test(`production ${event.app} camera uses local WASM/lazy JS with correct MIME, confirm and track cleanup`, async () => {
    await withCamera(serializeEvents(event.app, [event]), async (page, _context, requests) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('requestfailed', (request) => errors.push(request.url()));
      await load(page, event.app);
      const wasm = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('.wasm'));
      await page.getByRole('button', { name: 'Start camera', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled({ timeout: 20000 });
      const response = await wasm;
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('application/wasm');
      expect(new URL(response.url()).origin).toBe(base.origin);
      expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([]);
      expect(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended'))).toBe(true);
      await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
      await expect(page.locator('#count')).toHaveText('1');
      expect(await page.evaluate(() => window.cameraHarness.events())).toEqual([event]);
      expect(requests.some((url) => /ponyfill.*\.js/.test(url))).toBe(true);
      expect(requests.every((url) => {
        const asset = new URL(url);
        return asset.origin === base.origin && asset.pathname.startsWith(base.pathname);
      })).toBe(true);
      expect(errors).toEqual([]);
    }, base.origin);
  });
}

test('unknown/source/secret paths return errors instead of an HTML-success asset fallback', async ({ request }) => {
  for (const relative of ['assets/missing.js', '.env', '.git/config', 'src/main.ts']) {
    const response = await request.get(new URL(relative, base).href);
    expect(response.status()).toBe(404);
  }
});
