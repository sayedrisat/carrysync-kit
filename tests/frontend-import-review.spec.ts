import { expect, test } from '@playwright/test';
import { serializeEvents, type SyncEvent } from '@carrysync/core';
import { withCamera } from './helpers/camera-fixture.js';

const stock: SyncEvent = {
  app: 'field-ledger', type: 'stock.moved', id: '90000000-0000-4000-8000-000000000001',
  deviceId: '00000000-0000-4000-8000-000000000001', createdAt: '2026-11-19T00:00:00.000Z',
  data: { productId: 'Reviewed Rice', quantityDelta: 5 },
};
const replacement: SyncEvent = {
  ...stock, id: '90000000-0000-4000-8000-000000000002',
  data: { productId: 'Replacement Oil', quantityDelta: 100 },
};

for (const delayed of [false, true]) {
  test(`manual payload edits invalidate ${delayed ? 'pending' : 'completed'} reviews before confirmation`, async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.locator('nav:visible').getByRole('button', { name: 'QR Sync', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Scanner text', exact: true });
    await expect(input).toBeVisible();
    if (delayed) {
      // Preserve the real service/IndexedDB read; delay only its completion to
      // reproduce a user editing the payload while preview computation is pending.
      await page.evaluate(async () => {
        const modulePath = '/src/services/sync.ts';
        const { getFieldLedger } = await import(modulePath) as {
          getFieldLedger(): Promise<{ service: { previewImport(text: string): Promise<unknown> } }>;
        };
        const { service } = await getFieldLedger();
        const original = service.previewImport.bind(service);
        const surface = window as typeof window & { releasePreview(): void; previewCaptured?: boolean };
        const gate = new Promise<void>((resolve) => { surface.releasePreview = resolve; });
        service.previewImport = async (text) => {
          const preview = await original(text);
          surface.previewCaptured = true;
          await gate;
          return preview;
        };
      });
    }
    await input.fill(serializeEvents('field-ledger', [stock]));
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    if (delayed) {
      await page.waitForFunction(() => (window as typeof window & { previewCaptured?: boolean }).previewCaptured);
    } else {
      await expect(page.getByText('Balance: 0 → 5', { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await input.fill(serializeEvents('field-ledger', [replacement]));
    if (delayed) await page.evaluate(() => (window as typeof window & { releasePreview(): void }).releasePreview());
    await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Import review', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).not.toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Payload changed. Review it again before importing.' })).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    // The replacement becomes importable only after its own fresh review.
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await expect(page.getByText('Balance: 0 → 100', { exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Import complete. 1 movement(s) added.' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Replacement Oil/ })).toHaveCount(1);
    await expect(page.getByRole('checkbox', { name: /Reviewed Rice/ })).toHaveCount(0);
    await page.reload();
    await page.locator('nav:visible').getByRole('button', { name: 'QR Sync', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: /Replacement Oil/ })).toHaveCount(1);
    await expect(page.getByRole('checkbox')).toHaveCount(1);
  });
}

test('FieldLedger camera UI decodes real WASM frames, confirms once and stops tracks on rescan/navigation', async () => {
  await withCamera(serializeEvents('field-ledger', [stock]), async (page) => {
    await page.goto('http://127.0.0.1:5173');
    await page.locator('nav:visible').getByRole('button', { name: 'QR Sync', exact: true }).click();
    for (const added of [1, 0]) {
      await page.getByRole('button', { name: 'Start camera', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'QR code detected — review before importing', exact: true })).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('checkbox')).toHaveCount(added === 1 ? 0 : 1);
      expect(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended'))).toBe(true);
      await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'QR code detected — review before importing', exact: true })).not.toBeVisible();
      await expect(page.getByRole('checkbox', { name: /Reviewed Rice/ })).toHaveCount(1);
    }
    await page.locator('nav:visible').getByRole('button', { name: 'History', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Reviewed Rice', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended'))).toBe(true);
  }, 'http://127.0.0.1:5173');
});
