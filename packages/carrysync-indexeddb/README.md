# @carrysync/indexeddb

Optional Dexie 4 adapter for the unchanged `@carrysync/core` EventStore port. Private npm workspace package; not published to the registry.

```ts
import { createClient } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';

const db = openDb('carrysync-v1');
const store = new IndexedDbEventStore(db);
const client = createClient('field-ledger', store, await getOrCreateDeviceId(db));
// await client.createEvent(...), client.listEvents(), client.importPayload(text)
// Release this connection when the owning module/test ends:
db.close();
```

`new IndexedDbEventStore()` also works and exposes its default connection through readonly `store.db`. Default database name `carrysync-v1`, Dexie schema version 1. `openDb` constructs a lazy connection, not a Promise. Use the same name **and origin/browser storage profile** to share events/identity across tabs; different origins/profiles are isolated. Changing the DB name selects another identity/store.

One events table has compound primary key `[app+id]`; identity holds one `deviceId` UUID. Read/transform/full validation/range-delete/bulk-write execute inside one readwrite transaction. Callback transforms must be synchronous; async results are rejected before writes. This port supports replacement/removal; normal client imports perform conflict-checked union. Close/reopen retention, shared-tab races and clean browser restarts are tested.

Existing `CarrySyncError` objects pass through unchanged; unknown transform/storage errors map to a safe `STORAGE_FAILED`. Unlike the memory reference adapter's direct raw transform exceptions, the durable adapter never exposes unknown exception details. Invalid persisted keys/content fail closed. A corrupt stored identity is rejected rather than silently rotated. Blocked opening rejects; release the blocking connection and retry with a fresh instance. Low-level `db.open/delete/table` access is advanced Dexie API and exposes Dexie errors; the EventStore and identity operations provide the SDK's safe error surface.

No production v2 migration is shipped. Future `version(N).stores(...).upgrade(tx => ...)` changes must preserve event keys/content and device identity or abort. Browser eviction/user clearing can still erase data. No quota management, PWA caching, camera acquisition, encryption/authentication, or physical-phone/airplane-mode certification is included. Both application source trees remain unchanged; adapter wiring is a documented teammate handoff.

Build/test from the root: `npm run build:indexeddb`, `npm test`, `npm run test:browser`. The harness is test-only and is not included in either app's production build.

Package source: MIT. Dexie `4.4.7`: Apache-2.0.
