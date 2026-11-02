import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient, InMemoryEventStore } from '@carrysync/core';
import { CameraScanner, QrImportSession } from '@carrysync/camera';

// No DOM, media or WASM side effects merely from importing the compiled package in Node/SSR.
assert.equal(typeof globalThis.document, 'undefined');
const client = createClient('field-ledger', new InMemoryEventStore(), crypto.randomUUID());
const event = await client.createEvent({ type: 'stock.moved', data: { productId: 'demo-rice', quantityDelta: 5 } });
const qr = await client.prepareExport([event]);
const session = new QrImportSession('field-ledger', client);
assert.equal(session.reviewText(qr.payload).state, 'review');
assert.equal((await session.confirmImport()).state, 'duplicate');
const scanner = new CameraScanner({ app: 'field-ledger', importer: client, wasmUrl: '/decoder.wasm' });
scanner.dispose();
const wasm = await readFile(new URL(import.meta.resolve('@carrysync/camera/decoder.wasm')));
assert.deepEqual([...wasm.subarray(0, 4)], [0, 97, 115, 109]);
const notices = await readFile(new URL(import.meta.resolve('@carrysync/camera/notices')), 'utf8');
assert.match(notices, /Apache License/);
console.log('Compiled JS camera/manual exports are SSR-importable; decoder asset and license notices resolve.');
