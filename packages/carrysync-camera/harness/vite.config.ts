import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const certPath = process.env.CARRYSYNC_TLS_CERT;
const keyPath = process.env.CARRYSYNC_TLS_KEY;
if (Boolean(certPath) !== Boolean(keyPath)) throw new Error('Set both CARRYSYNC_TLS_CERT and CARRYSYNC_TLS_KEY for HTTPS.');
const commit = process.env.CARRYSYNC_BUILD_SHA || 'local-unversioned';
if (commit !== 'local-unversioned' && !/^[0-9a-f]{40}$/.test(commit)) throw new Error('CARRYSYNC_BUILD_SHA must be a full public Git commit hash.');

export default defineConfig({
  // Portable static artifact: JS, lazy chunks, WASM and notices resolve at root or a Pages subpath.
  base: './',
  define: { 'import.meta.env.CARRYSYNC_BUILD_SHA': JSON.stringify(commit) },
  plugins: [{
    name: 'carrysync-public-build-metadata',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ application: 'CarrySync camera harness', commit }) + '\n' });
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
    },
  }],
  server: {
    ...(certPath && keyPath ? { https: { cert: readFileSync(certPath), key: readFileSync(keyPath) } } : {}),
  },
});
