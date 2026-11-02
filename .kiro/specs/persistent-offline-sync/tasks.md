# Tasks: Persistent Offline Synchronization (Phase 2)

> **STATUS: implementation recovered and verified by Codex (2026-11-02).** Kiro's original specs,
> metadata and partial implementation are preserved in checkpoint `df2f798`. Kiro completed scaffold,
> schema, shared tests and an initial identity implementation; Codex completed/revalidated the remaining
> tasks. Checkmarks describe current implementation/verification, not fabricated Kiro execution.


## Phase 0 — Setup

- [x] **0.1** Confirm open decisions D1–D4 with the lead. Record decisions in `design.md`.
  - Files: `design.md`.
  - Verification: each decision marked "confirmed" with the reviewer's choice.

- [x] **0.2** Scaffold the `packages/carrysync-indexeddb` workspace package.
  - Files: `package.json` (root — add to `workspaces`), `packages/carrysync-indexeddb/package.json`,
    `packages/carrysync-indexeddb/tsconfig.json`, `packages/carrysync-indexeddb/src/index.ts` (empty stub).
  - Details: `name: @carrysync/indexeddb`, `type: module`, `dependencies: { dexie: "4.4.7" }`,
    `peerDependencies: { "@carrysync/core": "0.1.0" }`, `devDependencies: { "@carrysync/core": "0.1.0" }` (npm workspace-compatible local version).
    tsconfig extends `../../tsconfig.base.json`, `module/moduleResolution: NodeNext`, `declaration: true`.
  - Verification: `npm install` resolves; `npm run typecheck` passes with an empty package.

- [x] **0.3** Add `fake-indexeddb` `6.2.7` as a dev dependency (root or adapter package, coordinate
  lockfile edits per `.kiro/steering/structure.md`).
  - Files: `package.json`, root `package-lock.json`.
  - Verification: `npm ci` reproducible; `npm audit --omit=dev` unchanged (dev-only dep).

- [x] **0.4 (D3)** If confirmed: export `toCarrySyncError` as `mapStorageError` from `@carrysync/core`.
  - Files: `packages/carrysync-core/src/index.ts` (`+1` line),
    `docs/api-contract.md` (document the new export under "Implemented functions").
  - Verification: existing `core.test.ts` green; `mapStorageError` importable from `@carrysync/core`.

## Phase 1 — Shared EventStore contract suite (TR-1)

- [x] **1.1** Extract a reusable, parameterized contract suite from the existing storage assertions in
  `core.test.ts`.
  - Files: `packages/carrysync-core/tests/event-store.contract.ts` (new — exports
    `describeEventStoreContract(name, makeStore)`); `core.test.ts` (refactor the storage block to call it
    for `InMemoryEventStore`).
  - Constraint: do not weaken any existing assertion or fast-check seed. Behavior must be identical.
  - Cases: detached snapshots, per-app isolation, transform abort rollback, duplicate-safe update,
    `CONFLICTING_EVENT` on transform result, `INVALID_EVENT` on transform result, 20 concurrent updates,
    adapter failure maps to `STORAGE_FAILED` with a safe message.
  - Verification: `npm test` — the 28 existing tests still pass (refactored, not removed/relaxed).

- [x] **1.2** Add the async-transform-rejection case to the contract suite.
  - Files: `packages/carrysync-core/tests/event-store.contract.ts`.
  - Detail: an `async` transform that awaits an external promise must either reject or fail to mutate
    storage — assert that no silent stale-data success occurs. Documents the "no async user callback"
    contract (FR-11).
  - Verification: new case passes for `InMemoryEventStore` (rejects synchronously) and
    `IndexedDbEventStore` (explicit runtime rejection before writes).

## Phase 2 — Database and identity (FR-1, FR-4, FR-7, FR-8)

- [x] **2.1** Implement the Dexie schema (`CarrySyncDb`) and `openDb`.
  - Files: `packages/carrysync-indexeddb/src/db.ts`.
  - Detail: compound primary key `[app+id]` on `events`; `identity` table keyed by `'deviceId'`;
    injectable DB name (default `'carrysync-v1'`). Version 1 only.
  - Verification: typechecks; a quick smoke test opens and closes a DB (fake-indexeddb).

- [x] **2.2** Implement `getOrCreateDeviceId(db)`.
  - Files: `packages/carrysync-indexeddb/src/identity.ts`, `src/index.ts` (export).
  - Detail: `rw` transaction on `identity`; get → create-if-absent → return. UUID from
    `crypto.randomUUID()`. Throw `STORAGE_FAILED` (via `mapStorageError`) on DB errors.
  - Verification: `identity.test.ts` — first call returns valid UUID; repeated calls return same UUID;
    two concurrent calls on fresh DB return same UUID; cleared DB returns a new UUID.

## Phase 3 — IndexedDB EventStore (FR-2, FR-4, FR-5, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-18)

- [x] **3.1** Implement `IndexedDbEventStore.list(app)`.
  - Files: `packages/carrysync-indexeddb/src/store.ts`, `src/index.ts` (export).
  - Detail: range query on `[app+id]`; map rows to events; `mergeEvents(app, rows, [])` to re-validate,
    dedupe, sort, detach. Wrap errors via `mapStorageError`.
  - Verification: contract suite (1.1) passes for the IndexedDB factory.

- [x] **3.2** Implement `IndexedDbEventStore.update(app, transform)`.
  - Files: `packages/carrysync-indexeddb/src/store.ts`.
  - Detail: single Dexie `rw` transaction — read current → synchronous transform →
    `mergeEvents(app, [], next)` validate → range-delete app's rows → `bulkPut` new rows → return
    detached snapshot via `mergeEvents(app, [], validated)`. Throw propagates; Dexie aborts the
    transaction (rollback).
  - Verification: contract suite green; rollback case leaves prior events unchanged;
    `CONFLICTING_EVENT`/`INVALID_EVENT` propagate with their codes; 20 concurrent in-process updates
    retain all events.

- [x] **3.3** Wire `IndexedDbEventStore` into the contract suite via a fake-indexeddb factory.
  - Files: `packages/carrysync-indexeddb/tests/contract.test.ts`.
  - Detail: each case opens a DB with a unique name; configure fake-indexeddb globally for the test
    file via `globalThis.indexedDB = fakeIndexedDB` (and `IDBKeyRange`). Tear down between cases.
  - Verification: contract suite passes for both adapters with the same data invariants; preserve memory raw-transform errors and assert safe persistent-adapter mapping, as clarified in design recovery notes.

## Phase 4 — Reopen and migration readiness (FR-6, FR-17)

- [x] **4.1** Reopen retention test.
  - Files: `packages/carrysync-indexeddb/tests/store.test.ts`.
  - Detail: accept events + assign device UUID → close the `Dexie` instance → reopen with the same
    name → `list` returns identical events; `getOrCreateDeviceId` returns the same UUID.
  - Verification: passes with fake-indexeddb.

- [x] **4.2** Migration infrastructure (v1 only; no v2 schema yet).
  - Files: `packages/carrysync-indexeddb/src/db.ts` (document the `version(2).upgrade()` extension point),
    `docs/api-contract.md` / `architecture.md` note.
  - Detail: define the upgrade contract: a future `version(N).stores(...).upgrade(tx => ...)` must copy
    existing `events` rows to the new schema preserving `[app, id]` and `event` content, or abort. Add a
    test that re-opens a v1 DB populated with events and asserts all rows survive a no-op reopen.
  - Verification: reopen-no-op test passes; no actual schema change is shipped.

## Phase 5 — Property tests (TR-2)

- [x] **5.1** Memory-vs-IndexedDB equivalence property test.
  - Files: `packages/carrysync-indexeddb/tests/indexeddb.property.test.ts` (or extend `core.test.ts`).
  - Detail: `fc.asyncProperty` over generated compatible event sets; apply the same sequence of
    `update` calls to a memory store and an IndexedDB store; assert identical final `events`, `added`,
    and `duplicates`. Use Unicode-rich productId/quiz data. Preserve seed `20261102`; record new seeds.
  - Verification: passes; counterexamples (if any) recorded with seeds.

- [x] **5.2** Conflict-on-import property test (separate generator).
  - Files: `packages/carrysync-indexeddb/tests/indexeddb.property.test.ts`.
  - Detail: generate pairs with same ID + different content; assert `importPayload` rejects with
    `CONFLICTING_EVENT` and the store is unchanged before and after. Do not assert a union law on
    incompatible content (per `.kiro/steering/testing.md`).
  - Verification: passes.

## Phase 6 — Real-browser persistence test (TR-3)

- [x] **6.1** Build the adapter package and a minimal harness page.
  - Files: `packages/carrysync-indexeddb/harness/index.html` (no React; imports the built adapter and
    exposes a small `window.carrysyncTest` API: `openStore`, `createEvent`, `list`, `getDeviceId`,
    `reload`), `vite.config.ts` for the harness (or reuse a static-server config).
  - Verification: harness page loads in Chromium and exposes the API.

- [x] **6.2** Playwright reopen test.
  - Files: `tests/indexeddb.spec.ts`, `playwright.config.ts` (add a harness webServer on port 5175).
  - Detail: create an event → `page.reload()` → `list` returns the same event; device UUID stable across
    reload; assert no uncaught page errors.
  - Verification: `npm run test:browser` green in Chromium.

- [x] **6.3** Playwright concurrent-tabs test.
  - Files: `tests/indexeddb.spec.ts`.
  - Detail: two `page` instances on the same origin/DB name issue concurrent `update` calls with
    compatible events → each `list` contains the union; cross-tab conflict → one rejects with
    `CONFLICTING_EVENT`, the other's store unchanged.
  - Verification: `npm run test:browser` green.

## Phase 7 — Failure mapping (FR-18, TR-4)

- [x] **7.1** Quota/abort simulation test.
  - Files: `packages/carrysync-indexeddb/tests/store.test.ts`.
  - Detail: stub the Dexie transaction to throw a `QuotaExceededError`-shaped error on commit; assert
    the adapter throws `CarrySyncError` with `code: 'STORAGE_FAILED'`, a safe generic message containing
    no payload contents or internal exception text, and that previously committed data is unchanged.
  - Verification: test green.

## Phase 8 — Docs, audit, final verification

- [x] **8.1** Update `docs/api-contract.md`: move `IndexedDbEventStore`, `getOrCreateDeviceId`, and
  `mapStorageError` from "Proposed APIs" to a new "Implemented (Phase 2)" section. Document the DB name,
  schema version, and the async-transform contract.
  - Files: `docs/api-contract.md`.
  - Verification: docs match the shipped exports exactly.

- [x] **8.2** Add a Phase 2 entry to `docs/validation.md` (executed commands + results, no fabricated
  physical-device evidence) and update `README.md` current-status table.
  - Files: `docs/validation.md`, `README.md`.
  - Verification: claims distinguish fake-indexeddb, desktop Chromium, and (absent) physical-device
  evidence per `.kiro/steering/testing.md`.

- [x] **8.3** Run the full verification checklist from `design.md`.
  - Verification: `npm run check` green; `npm run test:browser` green; `npm audit --omit=dev` clean;
  existing fast-check seeds/counterexamples preserved; core imports cleanly in Node without Dexie.

- [x] **8.4 (optional, coordinated)** App integration handoff snippet documented and its SDK pattern verified. **Actual app wiring remains intentionally deferred.**
  - Files: none changed; document the exact snippet for `apps/*/src/services/carrysync.ts` in
    `docs/frontend-handoff.md` for the teammate to apply on `feature/frontend`.
  - Snippet:
    ```ts
    import { createClient } from '@carrysync/core';
    import { IndexedDbEventStore, getOrCreateDeviceId } from '@carrysync/indexeddb';
    const store = new IndexedDbEventStore();   // optional documented integration; apps remain unchanged
    const carrysync = createClient('field-ledger', store, await getOrCreateDeviceId(store.db));
    // Note: this makes the module's top-level await async; the teammate owns this integration.
    ```
  - Verification: handoff snippet compiles against the shipped adapter; no app files modified.

## Definition of done

All of the following are true:
- [x] `npm run check` passes with no regressions (existing 28 tests + properties unchanged).
- [x] `IndexedDbEventStore` passes the shared contract suite alongside `InMemoryEventStore`.
- [x] `getOrCreateDeviceId` is stable across reopens and concurrent tabs.
- [x] A failed/conflicting/aborted `update` commits nothing.
- [x] Reimported events are duplicate-safe (one stored record per ID).
- [x] Real-browser reopen + concurrent-tab tests pass in Chromium.
- [x] Simulated quota failure maps to `STORAGE_FAILED` with a safe message.
- [x] `@carrysync/core` still imports cleanly in Node without Dexie.
- [x] `docs/api-contract.md`, `README.md`, `docs/validation.md` updated with accurate evidence.
- [x] Open decisions D1–D4 confirmed and recorded in `design.md`.


## Execution notes

Existing core regression assertions and seed `20261102` are preserved. Current suites: 66 Vitest tests (including both adapters' contract tests and 200 new generated cases at seeds `20261103`/`20261104`) plus 9 Playwright tests, including real shared-storage races and a full same-profile Chrome restart. See `docs/phase-2-implementation.md` for exact commands/results. No frontend files were modified. Only schema v1/no-op reopen is shipped; actual future schema upgrades, camera/two-phone scanning and PWA airplane-mode behavior are outside this checklist.
