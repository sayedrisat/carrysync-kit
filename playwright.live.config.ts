import { defineConfig } from '@playwright/test';

const url = process.env.CARRYSYNC_TEST_URL;
if (!url || new URL(url).protocol !== 'https:') throw new Error('Set CARRYSYNC_TEST_URL to the deployed HTTPS harness URL.');

export default defineConfig({
  testDir: './tests',
  testMatch: ['static-harness.spec.ts', 'offline-pwa.spec.ts'],
  fullyParallel: false,
  retries: 1,
  use: { browserName: 'chromium', channel: 'chrome', headless: true },
});
