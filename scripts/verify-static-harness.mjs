import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../packages/carrysync-camera/harness/dist/', import.meta.url));
const files = [];
async function walk(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), 'Static artifact must not contain symbolic links.');
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { assert.equal(entry.name, 'assets'); await walk(path, 'assets/'); }
    else files.push({ relative: relative + entry.name, path });
  }
}
await walk(root);
const html = await readFile(join(root, 'index.html'), 'utf8');
assert.match(html, /Content-Security-Policy/);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  assert.ok(value?.startsWith('./assets/') || value === 'data:,', 'HTML asset reference must be relative/local.');
}
assert.ok(files.some((file) => file.relative.endsWith('.wasm')));
assert.ok(files.some((file) => /ponyfill.*\.js$/.test(file.relative)));
assert.ok(files.some((file) => /THIRD_PARTY_NOTICES.*\.txt$/.test(file.relative)));
const secrets = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/, /AKIA[0-9A-Z]{16}/, /\bsk-[A-Za-z0-9_-]{30,}/];
for (const file of files) {
  assert.match(file.relative, /^(?:index\.html|build-info\.json|\.nojekyll|assets\/[A-Za-z0-9_-]+\.(?:js|wasm|txt|css|svg))$/);
  if (!file.relative.endsWith('.wasm')) {
    const text = await readFile(file.path, 'utf8');
    assert.ok(!secrets.some((pattern) => pattern.test(text)), 'Credential-like content in static artifact.');
  }
}
const metadata = JSON.parse(await readFile(join(root, 'build-info.json'), 'utf8'));
assert.match(metadata.commit, /^(?:local-unversioned|[0-9a-f]{40})$/);
console.log(`Static artifact verified: ${files.length} files, relative asset paths, local WASM/notices and public source metadata; no source/env/key/map files or credential-pattern matches.`);
