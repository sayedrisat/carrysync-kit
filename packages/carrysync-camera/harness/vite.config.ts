import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const certPath = process.env.CARRYSYNC_TLS_CERT;
const keyPath = process.env.CARRYSYNC_TLS_KEY;
if (Boolean(certPath) !== Boolean(keyPath)) throw new Error('Set both CARRYSYNC_TLS_CERT and CARRYSYNC_TLS_KEY for HTTPS.');

export default defineConfig({
  server: {
    ...(certPath && keyPath ? { https: { cert: readFileSync(certPath), key: readFileSync(keyPath) } } : {}),
  },
});
