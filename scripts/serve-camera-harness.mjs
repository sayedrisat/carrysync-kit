// Local verification server for the exact built static files. No Vite/SPA fallback or source access.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../packages/carrysync-camera/harness/dist/', import.meta.url));
const root = resolve(directory);
const prefix = process.env.CARRYSYNC_PREVIEW_BASE || '/carrysync-kit/';
const port = Number(process.env.CARRYSYNC_PREVIEW_PORT || 5177);
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(prefix)) throw new Error('Preview base must be a simple absolute directory path ending in /.');
const types = { '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) { response.writeHead(405).end(); return; }
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    if (prefix !== '/' && url.pathname === prefix.slice(0, -1)) {
      response.writeHead(308, { location: prefix + url.search }).end();
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    const path = resolve(root, relative);
    if (!path.startsWith(root + sep) || !types[extname(path)]) { response.writeHead(404).end(); return; }
    if (!(await stat(path)).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[extname(path)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : await readFile(path));
  } catch { response.writeHead(404).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Static harness: http://127.0.0.1:${port}${prefix}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
