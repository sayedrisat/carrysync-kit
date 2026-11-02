import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

await copyFile(fileURLToPath(import.meta.resolve('zxing-wasm/reader/zxing_reader.wasm')),
  new URL('./dist/zxing_reader.wasm', import.meta.url));
await copyFile(new URL('./THIRD_PARTY_NOTICES.txt', import.meta.url),
  new URL('./dist/THIRD_PARTY_NOTICES.txt', import.meta.url));
