# Design: Persistent Offline Synchronization (Phase 2)

> **STATUS: D1–D4 retained; implementation completed and verified by Codex after the preserved Kiro checkpoint. See the recovery notes below.**
>
> This document is the technical design for the spec in `requirements.md`. All open decisions flagged
> with a `D-N` label have been reviewed and confirmed (see the table below). Changes to the proposed
> design should be noted here before tasks are started.

## Guiding principles

1. **Additive only.** No existing source file in `packages/carrysync-core/src/` or `tests/` or
   `apps/*/src/` changes unless the lead explicitly approves a targeted, minimal addition (specifically:
   exporting `toCarrySyncError` from core's public index, per open decision D3).
2. **Port contract is supreme.** The adapter must satisfy every behavioral contract in
   `InMemoryEventStore` — not just the TypeScript interface. The contract is documented precisely in
   `packages/carrysync-core/src/storage.ts`, the architecture doc, and the new shared contract test
   suite.
3. **Transaction atomicity over convenience.** All read + merge + write for one `update` call must live
   inside one IndexedDB `readwrite` transaction. No gap, no await on user code, no second transaction.
4. **Detached everything.** Every object exiting the adapter was either freshly constructed by `zod.parse`
   (via `mergeEvents`) or deep-cloned via `structuredClone`. Callers cannot reach into storage through a
   reference.
5. **Fail safely.** Storage errors are caught and re-raised as `STORAGE_FAILED` with a generic message; no
   payload contents or connection details are logged or surfaced.
6. **Core stays universally importable.** No browser-global dependency is loaded when `@carrysync/core` is
   imported in Node.

## Package structure

### Decision D1: adapter package placement

**Chosen: new workspace package `packages/carrysync-indexeddb`**

Rationale: keeping Dexie and IndexedDB physically out of `@carrysync/core` is a hard requirement (FR-1).
A `core/indexeddb` subpath export would require Dexie to appear in core's `dependencies`, which would
break non-browser environments that currently import core without issue. A new package declares its own
explicit Dexie dependency and is a lazy add-on for consumers.

```
packages/
  carrysync-core/          (unchanged except possible toCarrySyncError export, D3)
  carrysync-indexeddb/     (new)
    package.json           name: @carrysync/indexeddb, dep: dexie@4.4.7, peerDep: @carrysync/core
    tsconfig.json          extends ../../tsconfig.base.json, module: NodeNext
    src/
      db.ts                Dexie schema, version 1 definition, DB factory
      identity.ts          getOrCreateDeviceId() — device UUID persistence
      store.ts             IndexedDbEventStore — implements EventStore
      index.ts             exports: IndexedDbEventStore, getOrCreateDeviceId
    tests/
      contract.test.ts     shared EventStore contract (runs against both adapters via a factory param)
      identity.test.ts     stable UUID, concurrent creation, reopen retention
      store.test.ts        IndexedDB-specific: open/reopen, migration v1→v2 (future), quota simulation
```

### Decision D3: exporting `toCarrySyncError` from core

**Recommended: yes — export as `mapStorageError`** (a stable, intentional alias).

Only change to core: add `export { toCarrySyncError as mapStorageError }` in `src/index.ts` and document
it in `api-contract.md`. This is strictly additive; existing consumers are unaffected; `@carrysync/indexeddb`
reuses identical error-mapping semantics with zero duplication.

If this is declined in review, the adapter simply imports the same CarrySyncError directly and duplicates
the one-liner mapping. Either path is acceptable; the recommendation is cleaner.

## Database schema (Dexie, version 1)

```typescript
// packages/carrysync-indexeddb/src/db.ts
import Dexie, { type Table } from 'dexie';
import type { SyncEvent } from '@carrysync/core';

// Every accepted event stored exactly once per [app, id] composite key.
interface StoredEvent {
  app: string;   // ApplicationId value  — first part of compound index
  id: string;    // SyncEvent UUID       — second part
  event: SyncEvent; // validated, normalized serializable object
}

// Single-row table: one device identity per database.
interface IdentityRow {
  key: 'deviceId';
  value: string;  // UUID string
}

export class CarrySyncDb extends Dexie {
  events!: Table<StoredEvent, [string, string]>;   // primary key: [app, id]
  identity!: Table<IdentityRow, string>;           // primary key: key

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      events:   '[app+id]',
      identity: 'key',
    });
  }
}

export function openDb(name = 'carrysync-v1'): CarrySyncDb {
  return new CarrySyncDb(name);
}
```

Notes:
- `[app+id]` is Dexie's compound primary key syntax. This natively enforces the `[app, id]` uniqueness
  constraint and is queryable by just `app` for efficient per-app list (Dexie query: `where('[app+id]').between([app, Dexie.minKey], [app, Dexie.maxKey])`).
- `identity` table holds exactly one row `{ key: 'deviceId', value: '<uuid>' }`.
- DB name is injectable so tests can use isolated fake databases without file-system side effects.
- Schema version 1. A future v2 migration would add `this.version(2).stores(...).upgrade(...)`. This spec
  defines v1 only; migration infrastructure exists to support it safely.

## Device identity module

```typescript
// packages/carrysync-indexeddb/src/identity.ts
import type { CarrySyncDb } from './db.js';

/** Returns the stable device UUID, creating it on first call (idempotent across tabs). */
export async function getOrCreateDeviceId(db: CarrySyncDb): Promise<string> {
  return db.transaction('rw', db.identity, async () => {
    const existing = await db.identity.get('deviceId');
    if (existing) return existing.value;
    const id = crypto.randomUUID();
    await db.identity.put({ key: 'deviceId', value: id });
    return id;
  });
}
```

Transaction notes:
- `'rw'` (read-write) transaction scoped to the `identity` table only.
- Dexie serializes `rw` transactions for the same table; two tabs creating identity concurrently will
  each run get-then-put, but only one will find an empty row; the second will find the row already written
  and return the same UUID. This satisfies FR-8 (no duplicate identities).
- No `crypto.randomUUID()` call inside an async callback that might run after the transaction auto-commits:
  the UUID is generated synchronously before the `await db.identity.put(...)`.

## Storage adapter

```typescript
// packages/carrysync-indexeddb/src/store.ts
import type { ApplicationId, EventStore, SyncEvent } from '@carrysync/core';
import { mapStorageError, mergeEvents } from '@carrysync/core';   // mapStorageError = renamed toCarrySyncError
import type { CarrySyncDb } from './db.js';

export class IndexedDbEventStore implements EventStore {
  constructor(private readonly db: CarrySyncDb) {}

  async list(app: ApplicationId): Promise<SyncEvent[]> {
    try {
      const rows = await this.db.events
        .where('[app+id]')
        .between([app, Dexie.minKey], [app, Dexie.maxKey])
        .toArray();
      // mergeEvents re-validates, deduplicates, sorts and returns detached snapshots.
      return mergeEvents(app, rows.map(r => r.event), []).events;
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  async update(
    app: ApplicationId,
    transform: (current: readonly SyncEvent[]) => readonly SyncEvent[],
  ): Promise<SyncEvent[]> {
    try {
      return await this.db.transaction('rw', this.db.events, async () => {
        // (1) Read current accepted set inside the transaction.
        const rows = await this.db.events
          .where('[app+id]')
          .between([app, Dexie.minKey], [app, Dexie.maxKey])
          .toArray();
        const current = mergeEvents(app, rows.map(r => r.event), []).events;

        // (2) Run the synchronous transform (no awaits on external code allowed here).
        const next = transform(current);   // may throw; transaction will abort

        // (3) Validate + deduplicate + sort the transform result.
        const validated = mergeEvents(app, [], next).events;  // throws CONFLICTING_EVENT if broken

        // (4) Bulk-replace all rows for this app atomically within the transaction.
        await this.db.events
          .where('[app+id]')
          .between([app, Dexie.minKey], [app, Dexie.maxKey])
          .delete();
        await this.db.events.bulkPut(validated.map(e => ({ app, id: e.id, event: e })));

        return mergeEvents(app, [], validated).events;  // return detached snapshot
      });
    } catch (error) {
      throw mapStorageError(error);
    }
  }
}
```

**Critical implementation notes:**

- All four steps (read, transform, validate, write) happen inside one Dexie `rw` transaction. No `await`
  on external Promises between steps 1 and 4. Dexie's IDB transactions auto-commit on the microtask
  following the last `await` unless kept alive with a synchronous next operation.
- The transform callback is synchronous (per the `EventStore` interface contract: the interface shows no
  `async` keyword on the callback). If an adapter receives an `async` callback, the transaction would
  auto-commit after step 1 — this is a caller misuse. The contract test must assert that an `async`
  transform that tries to read from IndexedDB inside the callback fails with an error rather than
  silently succeeding with stale data.
- A thrown error inside the Dexie transaction block causes Dexie to abort the IDB transaction, rolling
  back all writes within it. This satisfies FR-9/FR-10.
- `mapStorageError` wraps any error not already a `CarrySyncError` into `STORAGE_FAILED` with a safe
  message. Domain-specific errors (`CONFLICTING_EVENT`, `INVALID_EVENT`) are already `CarrySyncError`
  instances and pass through unchanged.

## Concurrent-tab serialization

IndexedDB's own `readwrite` transaction mutex (per the IDB spec, overlapping `readwrite` transactions on
the same object store are serialized by the browser, regardless of the tab) guarantees that two tabs'
`update` calls for the same app are serialized. No additional lock is needed.

Concretely: Tab A and Tab B both call `update('field-ledger', transform)` at the same moment. Their
Dexie `rw` transactions are queued by the IDB implementation; whichever opens its transaction first
reads the current set, transforms, validates, and writes; the second then reads the (possibly updated)
set from the first and applies its own transform on top. The result equals the deterministic merge of
both batches, which is commutative and associative over compatible content (per the existing property
tests in `core.test.ts`). FR-15 is therefore satisfied by the IDB specification plus the merge law.

## Adapter test plan (what the tasks implement)

### Contract tests (Node, fake-indexeddb, Vitest) — TR-1

Run the same parameterized suite against a factory function. Two calls:
```
describeEventStoreContract('InMemoryEventStore', () => new InMemoryEventStore());
describeEventStoreContract('IndexedDbEventStore', () => new IndexedDbEventStore(openDb(uniqueName())));
```

Cases in the shared contract suite (directly mirroring `core.test.ts` assertions plus additions):
| Case | FR |
| --- | --- |
| Accepted event survives `list` | FR-4 |
| `list` returns detached snapshot; mutation does not corrupt storage | FR-14 |
| `update` returns detached snapshot | FR-14 |
| Per-app isolation: app A events don't appear in app B `list` | FR-5 |
| Transform abort rolls back; prior events unchanged | FR-9, FR-10 |
| Compatible batch: `added` + `duplicates` counts correct | FR-12 |
| Conflicting ID in transform result: `CONFLICTING_EVENT`, nothing committed | FR-10 |
| Invalid event in transform result: `INVALID_EVENT`, nothing committed | FR-13 |
| 20 concurrent `update` calls: all events present after `list` | FR-15 (in-process) |
| Adapter failure maps to `STORAGE_FAILED`; safe message, no internal details | FR-18 |

### Identity tests (Node, fake-indexeddb, Vitest) — FR-7, FR-8

- Returns a valid UUID on first call.
- Returns the same UUID on repeated calls to the same database.
- Two concurrent `getOrCreateDeviceId` calls on a fresh database return the same UUID.
- Fresh database after explicit clear returns a new UUID.

### Reopen test (Node, fake-indexeddb, Vitest) — FR-6

- Accept events → close DB reference → re-open with same name → `list` returns same events.
- Device UUID persists across reopen.
- (fake-indexeddb simulates reopen as a fresh `Dexie` instance over the same fake backing store.)

### Property tests — TR-2

Extend `packages/carrysync-core/tests/core.test.ts` (or a sibling `indexeddb.property.test.ts`) with
Dexie-backed assertions:
- `fc.asyncProperty(set, set, ...)`: memory and IndexedDB return identical final events after the same sequence of `update` calls.
- Unicode-rich payload data round-trips through IndexedDB without corruption.
- Conflicting IDs generated separately via `fc.tuple` require `CONFLICTING_EVENT` and leave storage unchanged.
- Preserve seed `20261102`, add new seeds for IndexedDB-specific properties.

### Real-browser persistence test (Playwright, Chromium) — TR-3

Delivered as a new test file `tests/indexeddb.spec.ts` using a minimal test harness page
(served by a separate Vite dev server on port 5175, or a static HTML page loaded via `file://`).

The harness page (`packages/carrysync-indexeddb/harness/index.html`) exposes a tiny JS API
that the Playwright test drives via `page.evaluate(...)`. No React, no app UI changes.

Scenarios:
- **Reopen:** load harness → create event → reload page → assert event persists via `list`.
- **Device UUID persistence:** create UUID on first load → reload → assert same UUID returned.
- **Concurrent tabs:** open two pages on same origin → both call `update` with compatible events → assert
  final `list` on each page contains all events from both writes.
- **Cross-tab conflict:** tab A commits event E1 → tab B tries to import E1 with different content →
  tab B gets `CONFLICTING_EVENT`; tab A's store is unchanged.

### Quota/permission simulation — TR-4

Using fake-indexeddb's transaction mock: patch the transaction `abort` path to simulate a quota-exceeded
error. Assert:
- Error is `CarrySyncError` with code `STORAGE_FAILED`.
- Message contains no internal exception text or payload contents.
- Previously committed data remains unchanged.

## Open decisions — reviewed and confirmed

| ID | Decision | Recommendation | Your call |
| --- | --- | --- | --- |
| D1 | Adapter placement | New `packages/carrysync-indexeddb` workspace package | ☑ Confirm ☐ Reject — **Confirmed:** new `packages/carrysync-indexeddb` workspace package |
| D2 | Dexie vs raw IndexedDB | Dexie `4.4.7` (Apache-2.0, zero runtime deps) | ☑ Confirm ☐ Reject — **Confirmed:** Dexie `4.4.7` (Apache-2.0, zero runtime deps) |
| D3 | Export `toCarrySyncError` as `mapStorageError` from core | Yes — purely additive | ☑ Confirm ☐ Reject — **Confirmed:** yes, export as `mapStorageError` (strictly additive) |
| D4 | Real-browser harness approach | Minimal harness page, Playwright-driven, no app UI change | ☑ Confirm ☐ Reject — **Confirmed:** minimal harness page, Playwright-driven, no app UI change |

## Files added / changed

### New (adapter package)
```
packages/carrysync-indexeddb/
  package.json
  tsconfig.json
  src/
    db.ts
    identity.ts
    store.ts
    index.ts
  harness/
    index.html        (minimal Playwright harness; no React)
  tests/
    contract.test.ts  (shared EventStore contract; parameterized factory)
    identity.test.ts  (UUID persistence, concurrent creation)
    store.test.ts     (reopen, abort, quota simulation)
    indexeddb.property.test.ts  (fast-check memory vs IndexedDB)
```

### Changed (minimal)
```
packages/carrysync-core/src/index.ts        +1 line: export toCarrySyncError as mapStorageError (D3)
packages/carrysync-core/tests/core.test.ts   extract shared contract helper (no behavior change)
docs/api-contract.md                        document IndexedDbEventStore, getOrCreateDeviceId,
                                             mapStorageError as proposed → implemented
playwright.config.ts                        add optional 3rd webServer for harness (port 5175)
package.json (root)                         add carrysync-indexeddb to workspaces
.kiro/steering/scope.md                     no change (IndexedDB is explicitly listed as next)
```

### Not touched
```
apps/field-ledger/src/services/carrysync.ts   (app integration is a separate coordinated step)
apps/quiz-relay/src/services/carrysync.ts
apps/*/src/components/**
apps/*/src/mocks/**
```

## Verification checklist (implementer runs before opening PR)

- [x] `npm run check` — zero new lint/type errors; all 28+ existing tests pass; existing fast-check seeds unchanged.
- [x] Contract tests green for `InMemoryEventStore` (must not regress) and `IndexedDbEventStore` (fake-indexeddb).
- [x] Identity tests green (fake-indexeddb).
- [x] Property tests green (seed `20261102` preserved; new IndexedDB seeds recorded).
- [x] Real-browser persistence test green in Chromium (`npm run test:browser`).
- [x] `npm audit --omit=dev` — zero new production vulnerabilities; Dexie Apache-2.0 license confirmed.
- [x] No new `any`, unchecked cast, or non-null assertion in adapter source.
- [x] No payload contents logged or surfaced in error messages.
- [x] Core can still be imported cleanly in Node without Dexie present on module resolution path.

## Out-of-scope (explicitly deferred)

- LWW timestamp conflict resolution — not defined; conflicts still reject the whole batch.
- Total store quota reporting and retention strategy — a future design.
- Durable storage upgrade beyond v1 → v2 — migration infrastructure is wired, but the v2 schema is not
  defined until a concrete schema change is needed.
- PWA service worker, app manifest, camera, two-phone physical evidence.


## Codex recovery implementation notes — 2026-11-02

The original Kiro spec and partial implementation are preserved exactly in commit `df2f798`. D1–D4 are unchanged. Codex completed `store.ts`, expanded identity validation/failure handling, added the dedicated harness and tests, and updated the documentation/checklist. Existing `tasks.meta.json` was not rewritten and contains no fabricated Codex-as-Kiro entries.

Differences/clarifications relative to the illustrative design snippets above:

- Public exports also include `CarrySyncDb` and `openDb`, making the illustrated identity/connection lifecycle usable without private-path imports. `new IndexedDbEventStore(db = openDb())` exposes readonly `store.db`; the original `getOrCreateDeviceId(db)` signature and core's additive `mapStorageError` are preserved.
- Reads validate stored wrapper `[app,id]` against event content as well as running `mergeEvents`. Corrupt identity fails with `STORAGE_FAILED` instead of silently assigning a new UUID.
- Runtime Promise/non-array transform results are explicitly rejected before writes; late Promise rejection is observed. No unrelated user callback work is awaited or kept alive. IndexedDB autocommits when there are no active requests and control returns to a later task; it is not accurate to describe every native `await`/microtask as automatically committing. Only adapter-owned IDB work is awaited (see [Dexie transaction guidance](https://dexie.org/docs/Dexie/Dexie.transaction%28%29)).
- Unknown storage/transform failures map to `STORAGE_FAILED` on the persistent adapter. The memory adapter keeps its original raw transform exception behavior. The shared suite retains the memory `cancel` assertion and checks the persistent adapter's documented safe mapping; both preserve domain errors by object identity and verify rollback.
- An opening blocked by a non-cooperating raw/older connection closes/rejects instead of hanging. Release the blocker and retry a fresh connection. Low-level exposed Dexie methods retain their own errors; EventStore/identity methods provide the structured error surface.
- Vitest resolves core imports to one source module to avoid duplicate source/build error-class identities. Public built ESM boundaries are independently tested by Node import scripts, the browser harness and a temporary consumer where Dexie/adapter/fake IndexedDB are absent.
- Harness uses a third Vite origin on port 5175, outside both app source trees. A BroadcastChannel barrier starts both tab imports after both are ready. Real Chromium verifies compatible union and conflicting-batch rejection, actual transaction abort, simulated quota failure, reload/reopen and full browser restart with the same disk profile.
- Production remains schema v1 as approved. A populated no-op v1 reopen is tested; future actual migrations require version-specific tests. Quota/denial faults are injected test conditions; no claim of filling a real device disk or physical airplane-mode testing is made.

Full execution and Kiro/Codex ownership details: `docs/phase-2-implementation.md` and `docs/validation.md`.
