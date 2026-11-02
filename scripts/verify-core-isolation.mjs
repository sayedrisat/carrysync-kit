import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Copy ONLY core and its declared dependencies into a temporary consumer. Dexie, the adapter
// and fake-indexeddb are absent. This tests the built public package without test-only aliases.
const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'carrysync-core-isolation-'));
const visited = new Set();
async function copyPackage(name) {
  if (visited.has(name)) return;
  visited.add(name);
  const source = name === '@carrysync/core' ? join(root, 'packages/carrysync-core') : join(root, 'node_modules', name);
  const target = join(temporary, 'node_modules', name);
  const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  await mkdir(target, { recursive: true });
  if (name === '@carrysync/core') {
    await writeFile(join(target, 'package.json'), JSON.stringify(manifest));
    await cp(join(source, 'dist'), join(target, 'dist'), { recursive: true });
  } else {
    await cp(source, target, { recursive: true });
  }
  for (const dependency of Object.keys(manifest.dependencies ?? {})) await copyPackage(dependency);
}
try {
  await copyPackage('@carrysync/core');
  await writeFile(join(temporary, 'verify.mjs'), `
    import assert from 'node:assert/strict';
    import { createClient, InMemoryEventStore } from '@carrysync/core';
    assert.equal(typeof globalThis.indexedDB, 'undefined');
    for (const name of ['dexie', '@carrysync/indexeddb', 'fake-indexeddb', '@carrysync/camera', 'barcode-detector', 'zxing-wasm']) {
      assert.throws(() => import.meta.resolve(name), { code: 'ERR_MODULE_NOT_FOUND' });
    }
    const client = createClient('field-ledger', new InMemoryEventStore(), crypto.randomUUID());
    await client.createEvent({ type: 'stock.moved', data: { productId: 'demo-rice', quantityDelta: 1 } });
    assert.equal((await client.listEvents()).length, 1);
  `);
  const result = spawnSync(process.execPath, [join(temporary, 'verify.mjs')], { encoding: 'utf8', cwd: temporary });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  console.log('Isolated core consumer passed: no Dexie, IndexedDB adapter or fake IndexedDB available.');
} finally { await rm(temporary, { recursive: true, force: true }); }
