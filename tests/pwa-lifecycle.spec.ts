// Local fault/update server exercises real worker networking, which Playwright routes do not intercept.
import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import type { AddressInfo } from 'node:net';

const directory = fileURLToPath(new URL('../packages/carrysync-camera/harness/dist/', import.meta.url));
async function server() {
  const state = { failWasm: false, corruptMetadata: false, version: 'a' };
  const instance = createServer(async (request, response) => {
    try {
      const path = new URL(request.url!, 'http://localhost').pathname;
      if (!path.startsWith('/carrysync-kit/')) { response.writeHead(404).end(); return; }
      const relative = path.slice('/carrysync-kit/'.length) || 'index.html';
      if (relative.includes('..')) { response.writeHead(404).end(); return; }
      if (relative.endsWith('.wasm') && state.failWasm) { response.writeHead(503).end(); return; }
      let content = await readFile(resolve(directory, relative));
      if (relative === 'build-info.json' && state.corruptMetadata) content = Buffer.from('{"commit":"different-build"}');
      if (relative === 'sw.js') content = Buffer.from(content.toString().replace(/const cacheName = prefix \+ "[a-f0-9]+"/, `const cacheName = prefix + "test-${state.version}"`));
      const type = ({ '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' } as Record<string, string>)[extname(relative)] || 'text/plain';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((done) => instance.listen(0, '127.0.0.1', done));
  return {
    state, url: `http://127.0.0.1:${(instance.address() as AddressInfo).port}/carrysync-kit/`,
    close: () => new Promise<void>((done) => { instance.closeAllConnections(); instance.close(() => done()); }),
  };
}
async function ready(page: Page) {
  await page.waitForFunction(() => !!window.cameraHarness);
  await expect(page.locator('#offline-status')).toContainText('Ready for Offline Use', { timeout: 40000 });
}

for (const fault of ['unavailable WASM', 'mismatched resource integrity']) {
  test(`${fault}: failed precache never claims ready and retry installs successfully`, async ({ page }) => {
    const host = await server();
    host.state.failWasm = fault === 'unavailable WASM';
    host.state.corruptMetadata = fault === 'mismatched resource integrity';
    try {
      await page.goto(host.url);
      await page.waitForFunction(() => !!window.cameraHarness);
      await expect(page.locator('#offline-status')).toContainText('unavailable or incomplete', { timeout: 40000 });
      expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
      expect(await page.evaluate(() => caches.keys())).toEqual([]);
      await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('1');
      const id = await page.locator('#device-id').textContent();
      host.state.failWasm = false; host.state.corruptMetadata = false;
      await page.locator('#offline-retry').click(); await ready(page);
      await expect(page.locator('#device-id')).toHaveText(id!);
      await expect(page.locator('#count')).toHaveText('1');
    } finally { await page.close(); await host.close(); }
  });
}

test('updates wait for all old pages, discard only obsolete scoped caches and preserve app records/UUID', async ({ page, context }) => {
  const host = await server();
  try {
    await page.goto(host.url); await ready(page);
    await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('1');
    const stock = await page.evaluate(() => window.cameraHarness.events());
    await page.locator('#app').selectOption('quiz-relay'); await expect(page.locator('#app')).toBeEnabled();
    await page.locator('#sample').click(); await expect(page.locator('#count')).toHaveText('1');
    const quiz = await page.evaluate(() => window.cameraHarness.events());
    const id = await page.locator('#device-id').textContent();
    await page.evaluate(async () => { await caches.open('unrelated-site-cache'); });
    const other = await context.newPage(); await other.goto(host.url); await ready(other);
    // Failure to install a new version must leave the current cached shell usable.
    host.state.version = 'failed'; host.state.failWasm = true;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((key) => key.endsWith('test-failed')))).toEqual([]);
    host.state.failWasm = false; host.state.version = 'b';
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await page.locator('#offline-retry').click();
    await expect(page.locator('#offline-status')).toContainText('update cached');
    expect(await page.evaluate(async () => (await caches.keys()).filter((key) => key.startsWith('carrysync-camera-shell:')).sort())).toEqual([
      'carrysync-camera-shell:/carrysync-kit/:test-a', 'carrysync-camera-shell:/carrysync-kit/:test-b',
    ]);
    const url = page.url(); await page.close(); await other.close();
    const reopened = await context.newPage(); await reopened.goto(url); await ready(reopened);
    await expect.poll(() => reopened.evaluate(() => caches.keys())).toEqual(['unrelated-site-cache', 'carrysync-camera-shell:/carrysync-kit/:test-b']);
    await expect(reopened.locator('#app')).toHaveValue('quiz-relay');
    expect(await reopened.evaluate(() => window.cameraHarness.events())).toEqual(quiz);
    await expect(reopened.locator('#device-id')).toHaveText(id!);
    await reopened.locator('#app').selectOption('field-ledger'); await expect(reopened.locator('#app')).toBeEnabled();
    expect(await reopened.evaluate(() => window.cameraHarness.events())).toEqual(stock);
    await context.setOffline(true); await reopened.reload(); await ready(reopened);
    expect(await reopened.evaluate(() => window.cameraHarness.events())).toEqual(stock);
    await context.setOffline(false); await reopened.close();
  } finally { await context.setOffline(false); for (const tab of context.pages()) await tab.close(); await host.close(); }
});
