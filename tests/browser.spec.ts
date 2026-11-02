import { expect, test } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

for (const [name, port] of [['FieldLedger', 5173], ['QuizRelay', 5174]] as const) {
  test(`${name}: real SDK create, rendered QR decode, duplicate import and validation`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}`);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create sample event' }).click();
    await expect(page.getByTestId('event-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Generate QR for selected event' }).click();
    const qr = page.getByAltText('CarrySync transfer QR');
    await expect(qr).toBeVisible();
    const png = PNG.sync.read(await qr.screenshot());
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(await page.getByLabel('QR payload').inputValue());
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
}

test('independent browser contexts exchange one app payload; other app rejects it', async ({ browser }) => {
  const source = await browser.newContext();
  const target = await browser.newContext();
  try {
    const a = await source.newPage();
    const b = await target.newPage();
    await a.goto('http://127.0.0.1:5173');
    await b.goto('http://127.0.0.1:5173');
    await a.getByRole('button', { name: 'Create sample event' }).click();
    await a.getByRole('button', { name: 'Generate QR for selected event' }).click();
    await expect(a.getByAltText('CarrySync transfer QR')).toBeVisible();
    const png = PNG.sync.read(await a.getByAltText('CarrySync transfer QR').screenshot());
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded).not.toBeNull();
    await b.getByLabel('QR payload').fill(decoded!.data);
    await b.getByRole('button', { name: 'Validate and import' }).click();
    await expect(b.getByRole('status')).toContainText('1 added, 0 duplicate(s), 1 total');
    await b.getByRole('button', { name: 'Validate and import' }).click();
    await expect(b.getByRole('status')).toContainText('0 added, 1 duplicate(s), 1 total');
    await b.goto('http://127.0.0.1:5174');
    await b.getByLabel('QR payload').fill(decoded!.data);
    await b.getByRole('button', { name: 'Validate and import' }).click();
    await expect(b.getByRole('status')).toContainText('WRONG_APPLICATION');
    await expect(b.getByTestId('event-count')).toHaveText('0');
  } finally { await source.close(); await target.close(); }
});
