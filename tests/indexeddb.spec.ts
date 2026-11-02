import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serializeEvents, type AppEvent } from '@carrysync/core';
import type { CarrySyncHarness } from '../packages/carrysync-indexeddb/harness/main.js';

declare global { interface Window { carrysyncTest: CarrySyncHarness } }
const url = 'http://127.0.0.1:5175';
const deviceId = '00000000-0000-4000-8000-000000000001';
function stock(id: number, delta = 5): AppEvent<'field-ledger'> {
  return {
    app: 'field-ledger', type: 'stock.moved', id: `20000000-0000-4000-8000-${id.toString().padStart(12, '0')}`,
    deviceId, createdAt: '2026-11-02T00:00:00.000Z', data: { productId: `rice-${id}`, quantityDelta: delta },
  };
}
async function load(page: Page) {
  await page.goto(url);
  await page.waitForFunction(() => !!window.carrysyncTest);
}
async function race(pages: [Page, Page], payloads: [string, string]) {
  const barrier = `carrysync-barrier-${crypto.randomUUID()}`;
  await Promise.all(pages.map((page, index) => page.evaluate(({ payload, barrier }) => {
    window.carrysyncTest.armImport('field-ledger', payload, barrier);
  }, { payload: payloads[index] ?? '', barrier })));
  await pages[0].evaluate((barrier) => {
    const channel = new BroadcastChannel(barrier);
    channel.postMessage('go');
    channel.close();
  }, barrier);
  return Promise.all(pages.map((page) => page.evaluate(() => window.carrysyncTest.finishImport())));
}

test('IndexedDB retains events/device ID through page reload and explicit database close/reopen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const name = `reload-${crypto.randomUUID()}`;
  await load(page);
  const id = await page.evaluate((name) => window.carrysyncTest.openStore(name), name);
  const event = await page.evaluate(() => window.carrysyncTest.createEvent({
    type: 'stock.moved', data: { productId: 'ধান / चावल / 米', quantityDelta: 7 },
  }));
  await page.reload();
  await page.waitForFunction(() => !!window.carrysyncTest);
  expect(await page.evaluate((name) => window.carrysyncTest.openStore(name), name)).toBe(id);
  expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual([event]);
  await page.evaluate(() => window.carrysyncTest.closeStore());
  await page.evaluate(() => window.carrysyncTest.reopenStore());
  expect(await page.evaluate(() => window.carrysyncTest.getDeviceId())).toBe(id);
  expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual([event]);
  expect(await page.evaluate(() => window.carrysyncTest.list('quiz-relay'))).toEqual([]);
  expect(await page.evaluate((payload) => window.carrysyncTest.importPayload('field-ledger', payload),
    serializeEvents('field-ledger', [event]))).toEqual({ ok: true, result: { added: 0, duplicates: 1, total: 1 } });
  expect(errors).toEqual([]);
});

test('fresh tabs initialize one identity and retain all simultaneous compatible imports', async ({ context }) => {
  const pages: [Page, Page] = [await context.newPage(), await context.newPage()];
  const errors: string[] = [];
  pages.forEach((page) => page.on('pageerror', (error) => errors.push(error.message)));
  await Promise.all(pages.map(load));
  const name = `concurrent-${crypto.randomUUID()}`;
  const ids = await Promise.all(pages.map((page) => page.evaluate((name) => window.carrysyncTest.openStore(name), name)));
  expect(ids[0]).toBe(ids[1]);
  const events = [stock(1), stock(2), stock(3)];
  const results = await race(pages, [
    serializeEvents('field-ledger', [events[0]!, events[1]!]),
    serializeEvents('field-ledger', [events[1]!, events[2]!]),
  ]);
  expect(results.every((result) => result.ok)).toBe(true);
  const totals = results.flatMap((result) => result.ok ? [result.result] : []);
  expect(totals.reduce((sum, result) => sum + result.added, 0)).toBe(3);
  expect(totals.reduce((sum, result) => sum + result.duplicates, 0)).toBe(1);
  for (const page of pages) expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual(events);
  expect(errors).toEqual([]);
});

test('simultaneous conflicting tab batches accept exactly one whole batch', async ({ context }) => {
  const pages: [Page, Page] = [await context.newPage(), await context.newPage()];
  await Promise.all(pages.map(load));
  const name = `conflict-${crypto.randomUUID()}`;
  await Promise.all(pages.map((page) => page.evaluate((name) => window.carrysyncTest.openStore(name), name)));
  const results = await race(pages, [
    serializeEvents('field-ledger', [stock(1), stock(2)]),
    serializeEvents('field-ledger', [stock(1, 99), stock(3)]),
  ]);
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toEqual([
    { ok: false, code: 'CONFLICTING_EVENT', message: 'An event ID has different content; the entire operation was rejected.' },
  ]);
  const expected = results[0]?.ok ? [stock(1), stock(2)] : [stock(1, 99), stock(3)];
  for (const page of pages) expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual(expected);
});

test('browser rejects invalid/wrong-app/conflicting imports with prior events unchanged', async ({ page }) => {
  await load(page);
  await page.evaluate((name) => window.carrysyncTest.openStore(name), `invalid-${crypto.randomUUID()}`);
  const initial = serializeEvents('field-ledger', [stock(1)]);
  await page.evaluate((payload) => window.carrysyncTest.importPayload('field-ledger', payload), initial);
  for (const [payload, code] of [
    ['{', 'INVALID_PAYLOAD'],
    ['x'.repeat(1201), 'PAYLOAD_TOO_LARGE'],
    [initial.replace('"version":1', '"version":2'), 'UNSUPPORTED_VERSION'],
    [serializeEvents('field-ledger', [stock(2), stock(1, 99)]), 'CONFLICTING_EVENT'],
  ]) {
    const result = await page.evaluate((payload) => window.carrysyncTest.importPayload('field-ledger', payload), payload ?? '');
    expect(result).toMatchObject({ ok: false, code });
    expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual([stock(1)]);
  }
  expect(await page.evaluate((payload) => window.carrysyncTest.importPayload('quiz-relay', payload), initial))
    .toMatchObject({ ok: false, code: 'WRONG_APPLICATION' });
  expect(await page.evaluate(() => window.carrysyncTest.list('quiz-relay'))).toEqual([]);
});

test('real Chromium rolls back after deletion when writes abort or quota failure is simulated', async ({ page }) => {
  await load(page);
  const id = await page.evaluate((name) => window.carrysyncTest.openStore(name), `failures-${crypto.randomUUID()}`);
  await page.evaluate((payload) => window.carrysyncTest.importPayload('field-ledger', payload),
    serializeEvents('field-ledger', [stock(1)]));
  for (const kind of ['quota', 'abort'] as const) {
    await page.evaluate((kind) => window.carrysyncTest.failNextWrite(kind), kind);
    expect(await page.evaluate((payload) => window.carrysyncTest.importPayload('field-ledger', payload),
      serializeEvents('field-ledger', [stock(2)]))).toEqual({
      ok: false, code: 'STORAGE_FAILED', message: 'The local event store could not complete the operation.',
    });
    expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual([stock(1)]);
    expect(await page.evaluate(() => window.carrysyncTest.getDeviceId())).toBe(id);
  }
});

test('events and identity survive a full Chrome restart with the same disk storage profile', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'carrysync-browser-profile-'));
  const name = `restart-${crypto.randomUUID()}`;
  let persistent: BrowserContext | undefined;
  try {
    persistent = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true });
    let page = await persistent.newPage();
    await load(page);
    const id = await page.evaluate((name) => window.carrysyncTest.openStore(name), name);
    const payload = serializeEvents('field-ledger', [stock(1), stock(2)]);
    expect(await page.evaluate((payload) => window.carrysyncTest.importPayload('field-ledger', payload), payload))
      .toMatchObject({ ok: true });
    await persistent.close();
    persistent = undefined;
    persistent = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true });
    page = await persistent.newPage();
    await load(page);
    expect(await page.evaluate((name) => window.carrysyncTest.openStore(name), name)).toBe(id);
    expect(await page.evaluate(() => window.carrysyncTest.list())).toEqual([stock(1), stock(2)]);
  } finally {
    await persistent?.close();
    await rm(profile, { recursive: true, force: true });
  }
});
