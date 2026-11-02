import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // One error-class identity across source contract tests and adapter imports.
  // Built package boundaries are independently verified by Node smoke scripts and the browser harness.
  resolve: { alias: { '@carrysync/core': fileURLToPath(new URL('./packages/carrysync-core/src/index.ts', import.meta.url)) } },
  test: { include: ['packages/*/tests/**/*.test.ts'], environment: 'node' },
});
