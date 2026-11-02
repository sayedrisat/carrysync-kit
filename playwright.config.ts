import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: { browserName: 'chromium', channel: 'chrome', headless: true },
  webServer: [
    { command: 'npm run dev --workspace=@carrysync/field-ledger', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
    { command: 'npm run dev --workspace=@carrysync/quiz-relay', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
  ],
});
