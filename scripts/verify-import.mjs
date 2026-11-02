import assert from 'node:assert/strict';
import { createClient, InMemoryEventStore, decodeQrPayload } from '@carrysync/core';

const client = createClient('field-ledger', new InMemoryEventStore(), crypto.randomUUID());
const event = await client.createEvent({ type: 'stock.moved', data: { productId: 'demo-rice', quantityDelta: 5 } });
const qr = await client.prepareExport([event]);
assert.deepEqual(decodeQrPayload(qr.payload, 'field-ledger').events, [event]);
assert.equal((await client.importPayload(qr.payload)).duplicates, 1);
assert.match(qr.svg, /<svg/);
console.log(`Public @carrysync/core import verified: ${qr.bytes} bytes, one valid event, duplicate-safe import.`);
