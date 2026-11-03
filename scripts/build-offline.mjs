// Codex Phase 4: generate a deterministic precache from the finished Vite artifact.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const directory = fileURLToPath(new URL('../packages/carrysync-camera/harness/dist/', import.meta.url));
const files = [];
async function walk(root, relative = '') {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) await walk(join(root, entry.name), relative + entry.name + '/');
    else if (!['sw.js', '.nojekyll'].includes(entry.name)) files.push(relative + entry.name);
  }
}
await walk(directory);
files.sort();
const template = await readFile(new URL('../packages/carrysync-camera/harness/service-worker.js', import.meta.url), 'utf8');
const hash = createHash('sha256').update(template);
const entries = [];
for (const file of files) {
  const content = await readFile(join(directory, file));
  hash.update(file).update(content);
  entries.push({ file, integrity: 'sha256-' + createHash('sha256').update(content).digest('base64') });
}
const version = hash.digest('hex');
// Replace only token usages, not comments. This worker is unbundled and scope-relative.
await writeFile(join(directory, 'sw.js'), template.replace('prefix + __VERSION__', 'prefix + ' + JSON.stringify(version)).replace('const entries = __FILES__', 'const entries = ' + JSON.stringify(entries)));
console.log(`Offline shell ${version.slice(0, 12)}: ${files.length} essential same-origin resources.`);
