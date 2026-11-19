import { expect, test, type Locator, type Page } from '@playwright/test';
import { deserializePayload } from '@carrysync/core';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

// The real UI renders a 256 CSS-pixel QR. Rasterize the SVG at a typical phone
// pixel density so the independent jsQR verifier gets clear module boundaries.
const deviceScaleFactor = 2;
test.use({ deviceScaleFactor });

// FieldLedger now has a real inventory UI. Exercise its public controls instead of
// restoring the removed Day 1 sample-event buttons just to satisfy old tests.
async function navigateFieldLedger(page: Page, name: 'Movements' | 'QR Sync') {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).click();
}

async function createMovement(page: Page) {
  await navigateFieldLedger(page, 'Movements');
  await page.getByRole('button', { name: 'Record movement', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record movement' });
  await form.getByLabel('Select product', { exact: true }).selectOption('__new_product__');
  await form.getByLabel('New product name', { exact: true }).fill('CI Rice');
  await form.getByLabel('Quantity', { exact: true }).fill('5');
  await form.getByRole('button', { name: 'Confirm stock IN', exact: true }).click();
  await expect(form).not.toBeVisible();
}

async function decodeRenderedQr(page: Page) {
  const qr = page.getByAltText('CarrySync transfer QR');
  await expect(qr).toBeVisible();
  const png = PNG.sync.read(await qr.screenshot({ path: test.info().outputPath('transfer-qr.png') }));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded).not.toBeNull();
  expect(decoded!.data).toBe(await page.getByRole('textbox', { name: 'QR payload', exact: true }).inputValue());
  return decoded!.data;
}

async function exportMovement(page: Page) {
  await navigateFieldLedger(page, 'QR Sync');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('checkbox', { name: /CI Rice/ }).check();
  await page.getByRole('button', { name: 'Generate QR (1)', exact: true }).click();
  return decodeRenderedQr(page);
}

async function reviewMovement(page: Page, payload: string) {
  await page.getByRole('textbox', { name: 'Scanner text', exact: true }).fill(payload);
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  const review = page.getByRole('heading', { name: 'Import review', exact: true }).locator('..');
  await expect(review).toBeVisible();
  return review;
}

async function expectReviewCount(review: Locator, label: string, count: number) {
  await expect(review.getByText(label, { exact: true }).locator('..').getByText(String(count), { exact: true })).toBeVisible();
}

// QR Sync has independent camera and manual-import status regions.
function importStatus(page: Page, message: string) {
  return page.getByRole('status').filter({ hasText: message });
}

test('FieldLedger: record stock, decode rendered QR, reject duplicates/conflicts/invalid data and retain records', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await createMovement(page);
  const payload = await exportMovement(page);
  const envelope = deserializePayload(payload, 'field-ledger');
  expect(envelope.events).toHaveLength(1);
  expect(envelope.events[0]).toMatchObject({ type: 'stock.moved', data: { productId: 'CI Rice', quantityDelta: 5 } });

  const duplicate = await reviewMovement(page, payload);
  await expectReviewCount(duplicate, 'New movements', 0);
  await expectReviewCount(duplicate, 'Duplicates', 1);
  await duplicate.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(importStatus(page, 'Import complete. 0 movement(s) added.')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(1);

  const conflict = structuredClone(envelope);
  const stock = conflict.events[0];
  if (!stock || stock.type !== 'stock.moved') throw new Error('Expected the stock movement created through the form.');
  stock.data.quantityDelta = 9;
  const conflicting = await reviewMovement(page, JSON.stringify(conflict));
  await expectReviewCount(conflicting, 'Conflicts', 1);
  await expect(conflicting.getByRole('button', { name: 'Confirm import', exact: true })).toBeDisabled();
  await conflicting.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('textbox', { name: 'Scanner text', exact: true }).fill('{broken');
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(importStatus(page, 'This is not a valid CarrySync QR code.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Import review', exact: true })).not.toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(1);

  await page.reload();
  await navigateFieldLedger(page, 'QR Sync');
  await expect(page.getByRole('checkbox', { name: /CI Rice/ })).toHaveCount(1);
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('QuizRelay: real SDK create, rendered QR decode, duplicate import and validation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174');
  await expect(page.getByRole('heading', { name: 'QuizRelay', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create sample event' }).click();
  await expect(page.getByTestId('event-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Generate QR for selected event' }).click();
  await decodeRenderedQr(page);
  await page.getByRole('button', { name: 'Validate and import' }).click();
  await expect(page.getByRole('status')).toContainText('0 added, 1 duplicate(s), 1 total');
  await page.getByLabel('QR payload').fill('{broken');
  await page.getByRole('button', { name: 'Validate and import' }).click();
  await expect(page.getByRole('status')).toContainText('INVALID_PAYLOAD');
  await expect(page.getByTestId('event-count')).toHaveText('1');
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('independent FieldLedger devices review without writes, import once, retain stock and reject wrong-app transfer', async ({ browser }) => {
  const source = await browser.newContext({ deviceScaleFactor });
  const target = await browser.newContext({ deviceScaleFactor });
  try {
    const a = await source.newPage();
    const b = await target.newPage();
    const errors: string[] = [];
    for (const page of [a, b]) page.on('pageerror', (error) => errors.push(error.message));
    await a.goto('http://127.0.0.1:5173');
    await b.goto('http://127.0.0.1:5173');
    await createMovement(a);
    const payload = await exportMovement(a);
    await navigateFieldLedger(b, 'QR Sync');
    await expect(b.getByRole('checkbox')).toHaveCount(0);

    const incoming = await reviewMovement(b, payload);
    await expectReviewCount(incoming, 'New movements', 1);
    await expectReviewCount(incoming, 'Duplicates', 0);
    await expect(incoming.getByText('Balance: 0 → 5', { exact: true })).toBeVisible();
    // Preview must not mutate the receiving device's persisted history.
    await expect(b.getByRole('checkbox')).toHaveCount(0);
    await incoming.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(importStatus(b, 'Import complete. 1 movement(s) added.')).toBeVisible();
    await expect(b.getByRole('checkbox', { name: /CI Rice/ })).toHaveCount(1);

    const duplicate = await reviewMovement(b, payload);
    await expectReviewCount(duplicate, 'New movements', 0);
    await expectReviewCount(duplicate, 'Duplicates', 1);
    await duplicate.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(importStatus(b, 'Import complete. 0 movement(s) added.')).toBeVisible();
    await expect(b.getByRole('checkbox')).toHaveCount(1);
    await b.reload();
    await navigateFieldLedger(b, 'QR Sync');
    await expect(b.getByRole('checkbox', { name: /CI Rice/ })).toHaveCount(1);
    await expect(b.getByRole('checkbox')).toHaveCount(1);

    await b.goto('http://127.0.0.1:5174');
    await b.getByLabel('QR payload').fill(payload);
    await b.getByRole('button', { name: 'Validate and import' }).click();
    await expect(b.getByRole('status')).toContainText('WRONG_APPLICATION');
    await expect(b.getByTestId('event-count')).toHaveText('0');
    expect(errors).toEqual([]);
  } finally { await Promise.all([source.close(), target.close()]); }
});
