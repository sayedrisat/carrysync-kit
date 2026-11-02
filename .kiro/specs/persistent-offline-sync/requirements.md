# Requirements: Persistent Offline Synchronization (Phase 2)

## Context

CarrySync Kit Day 1 ships a working, tested foundation: strict Zod event schemas, the CarrySync v1
JSON/QR envelope, deterministic compatible event-set merge with conflict rejection, and a storage
**port** (`EventStore`) with a single session-only reference implementation (`InMemoryEventStore`).
`createClient(app, store, deviceId)` is built entirely on that port, so the public SDK is already
storage-agnostic.

The one hard limit today: a refresh clears every event and regenerates the session device UUID.
`docs/architecture.md` ("Storage and offline strategy") and `docs/development-plan.md` milestone 2
name the next step explicitly: an **optional IndexedDB adapter and persistent device identity** that
preserve the existing `EventStore` contract. This spec realizes that step. It is additive — it does
not rewrite the SDK.

Reference material reviewed before writing this spec:
- `.kiro/steering/*` (product, scope, security, structure, tech, testing)
- `docs/architecture.md`, `docs/api-contract.md`, `docs/development-plan.md`, `docs/kiro-implementation-plan.md`, `docs/validation.md`
- `packages/carrysync-core/src/*.ts` (`events`, `errors`, `merge`, `protocol`, `qr`, `storage`, `client`, `index`)
- `packages/carrysync-core/tests/core.test.ts` (28 tests incl. 4×300 fast-check properties)
- `tests/browser.spec.ts`, `playwright.config.ts`, root `package.json`, `tsconfig.base.json`

## Scope

In scope:
- An optional IndexedDB adapter that implements the existing `EventStore` port.
- Stable, durable device identity for the lifetime of an origin's database.
- Atomic, duplicate-safe, conflict-rejecting persistence that survives reopen.
- Safe serialization of concurrent writes across browser tabs.
- Test infrastructure: a shared `EventStore` contract suite, extended property tests, and real-browser
  persistence/concurrency tests.

Out of scope (separate specs / future work):
- Editing teammate-owned app UI or app services. App integration is delivered only as a documented
  handoff snippet; the actual `apps/*/src/services/carrysync.ts` swap is a separately coordinated change.
- PWA service worker / installable manifest / airplane-mode (separate PWA spec).
- Camera acquisition and physical two-phone scanning (separate transport spec).
- Domain projections (inventory totals, quiz reference checks, grading) and conflict-recovery UX.
- Multipart QR, signatures, encryption, transport acknowledgments, backend/cloud sync.
- Two-phone and airplane-mode physical evidence.

## Existing behavior that must be preserved (invariants)

These are implemented in Day 1 and remain exactly as-is. The adapter must uphold them, not redefine them.

1. **`EventStore` port is unchanged.** `list(app): Promise<SyncEvent[]>` and
   `update(app, transform): Promise<SyncEvent[]>` where `transform` is synchronous. Throwing inside the
   transform aborts. Adapters serialize read+write, validate the whole batch, commit all-or-nothing, and
   return detached snapshots (`packages/carrysync-core/src/storage.ts`).
2. **`createClient(app, store, deviceId)` signature and semantics are unchanged.** It already accepts any
   `EventStore`; swapping the adapter requires no client change (`src/client.ts`).
3. **Deterministic compatible event-set union.** `mergeEvents` validates, dedupes, sorts by ID, rejects
   same-ID-different-content with `CONFLICTING_EVENT`, and returns detached copies (`src/merge.ts`).
4. **Full validation before the transaction.** `client.importPayload` deserializes + validates the entire
   envelope, then runs the validated merge inside `store.update` (`src/client.ts`).
5. **Error surface.** `CarrySyncError` with codes `INVALID_EVENT | INVALID_PAYLOAD | PAYLOAD_TOO_LARGE |
   UNSUPPORTED_VERSION | WRONG_APPLICATION | CONFLICTING_EVENT | QR_GENERATION_FAILED | STORAGE_FAILED`.
   Unknown adapter failures map to `STORAGE_FAILED` with a generic, payload-free message (`src/errors.ts`).
6. **Immutable identity.** Event UUIDs are random and never regenerated on export/import; timestamps are
   metadata, not authority. Device IDs are correlation metadata, not credentials.
7. **Security posture.** Scanned text is untrusted; no payload or internal storage exception is logged or
   surfaced; SVG is rendered through an image URL, never injected as HTML (`.kiro/steering/security.md`).

## Functional requirements (EARS)

> EARS form: `WHEN <precondition>, THE <system> SHALL <response>`. Each requirement carries a stable ID
> and maps to one or more of the user's seven input requirements (see Traceability).

### A. Adapter isolation and SDK compatibility

- **FR-1** — WHEN a non-browser or Node consumer imports `@carrysync/core`, THE SYSTEM SHALL NOT eagerly
  load IndexedDB, Dexie, or any browser-global database dependency merely to load the module.
  *(user req 7)*

- **FR-2** — WHEN a consumer adopts durable persistence, THE SYSTEM SHALL provide a separate adapter
  (package `@carrysync/indexeddb`) that implements the existing `EventStore` port, so that
  `@carrysync/core`'s already-exported public symbols keep their current signatures and behavior.
  *(user req 1, 7)*

- **FR-3** — WHEN an existing test or consumer runs against `@carrysync/core` after this work, THE SYSTEM
  SHALL pass the current `npm run check` (lint, typechecks, 28 unit/property tests, both app builds,
  public import smoke test) with no regression in existing assertions or fast-check seeds.
  *(user req 6, 7)*

### B. IndexedDB persistence

- **FR-4** — WHEN an event is accepted, THE SYSTEM SHALL persist it keyed by `[app, id]` in IndexedDB so
  that the same event survives a page refresh and a full database reopen.
  *(user req 1)*

- **FR-5** — WHEN `list(app)` is called, THE SYSTEM SHALL return the validated, ID-sorted, detached
  accepted set for that app, isolated from every other app's events.
  *(user req 1, 4)*

- **FR-6** — WHEN the IndexedDB database is reopened later, THE SYSTEM SHALL return all previously
  accepted events and the previously assigned device UUID, unless storage was explicitly cleared or
  evicted by the browser/user.
  *(user req 1, 2)*

### C. Stable device identity

- **FR-7** — WHEN a device identity is needed, THE SYSTEM SHALL obtain a single durable UUID via
  `getOrCreateDeviceId` that persists across browser sessions and is stable for the lifetime of the
  database.
  *(user req 2)*

- **FR-8** — WHEN two tabs request the device identity concurrently on a fresh database, THE SYSTEM SHALL
  return the same UUID to both, using an idempotent create-if-absent operation (no duplicate identities,
  no last-write-wins race).
  *(user req 2, 5)*

### D. Atomic batch import with rollback

- **FR-9** — WHEN `update(app, transform)` runs, THE SYSTEM SHALL perform read → (synchronous transform)
  → validate → write inside ONE IndexedDB `readwrite` transaction, so that a failure or abort leaves the
  previously accepted set byte-for-byte intact (all-or-nothing).
  *(user req 3)*

- **FR-10** — WHEN the transform throws, or its returned set fails validation (e.g. a same-ID content
  conflict), THE SYSTEM SHALL reject the complete batch, commit nothing, and rethrow the original
  `CarrySyncError` so existing error codes (`CONFLICTING_EVENT`, `INVALID_EVENT`) propagate unchanged.
  *(user req 3, 4)*

- **FR-11** — WHEN `update` is invoked, THE SYSTEM SHALL NOT allow an asynchronous user callback inside
  the transaction; only the adapter's own read/write coordination may await within the transaction scope.
  *(user req 3)*

### E. Duplicate-safe persistence

- **FR-12** — WHEN an already-accepted event is imported again, THE SYSTEM SHALL contain exactly one
  stored record for that ID, report it as a duplicate (not a new add), and never double-count its effect.
  *(user req 4)*

- **FR-13** — WHEN the adapter persists a new set, THE SYSTEM SHALL validate the full transform result via
  `mergeEvents` before any durable write, so a conflicting or malformed returned set is rejected with no
  partial write. *(Mirrors `InMemoryEventStore.update` exactly.)*
  *(user req 3, 4)*

- **FR-14** — WHEN a caller mutates an object returned by `list` or `update`, THE SYSTEM SHALL NOT mutate
  committed storage (returned objects are detached snapshots).
  *(user req 4, 7)*

### F. Concurrent browser tabs

- **FR-15** — WHEN two or more tabs/connections write to the same app store concurrently, THE SYSTEM SHALL
  serialize their `readwrite` transactions so that neither accepted batch is lost and the final accepted
  set equals the deterministic merge of all committed batches.
  *(user req 5)*

- **FR-16** — WHEN two concurrent batches conflict (same ID, different content), THE SYSTEM SHALL accept
  one whole batch and reject the other whole batch with `CONFLICTING_EVENT`, leaving the store reflecting
  only the accepted batch and the prior set otherwise intact.
  *(user req 5)*

### G. Migration and failures

- **FR-17** — WHEN the database schema version changes, THE SYSTEM SHALL run a tested migration that
  preserves existing events and device identity, or aborts safely so no data is corrupted.
  *(user req 1)*

- **FR-18** — WHEN IndexedDB is denied, full, blocked, or otherwise unavailable, THE SYSTEM SHALL surface
  a safe structured `STORAGE_FAILED` error and SHALL NOT report a false persistence success, leak payload
  contents, or leak internal storage exception details.
  *(user req 3, 7)*

### H. Testing

- **TR-1** — WHEN the adapter is delivered, THE SYSTEM SHALL pass a shared `EventStore` contract suite
  (detached snapshots, per-app isolation, duplicate-safe update, transform validation, atomic abort,
  serialized concurrent writers, typed failures) run against both `InMemoryEventStore` and the
  IndexedDB adapter (fake-indexeddb in Node).
  *(user req 6)*

- **TR-2** — WHEN property tests run, THE SYSTEM SHALL generate valid Unicode payloads, random duplicate
  distributions, equal-timestamp distinct-UUID events, and import interleavings, and SHALL assert that
  memory and IndexedDB produce identical final accepted sets and result counts; conflicting IDs are
  generated separately and required to fail with unchanged storage.
  *(user req 6)*

- **TR-3** — WHEN a real Chromium browser runs the persistence suite, THE SYSTEM SHALL demonstrate reopen
  retention (events + device UUID survive a fresh page/DB reopen) and concurrent-tab safety (no lost
  events across two pages writing the same database).
  *(user req 5, 6)*

- **TR-4** — WHEN a quota/permission failure is simulated, THE SYSTEM SHALL surface `STORAGE_FAILED` and
  leave committed data intact.
  *(user req 6)*

- **TR-5** — WHEN any check is skipped or environment-limited, THE SYSTEM SHALL report it accurately and
  SHALL NOT label fake-indexeddb proof, desktop browser proof, or CI as physical-device/airplane-mode
  proof. *(Per `.kiro/steering/testing.md`.)*
  *(user req 6)*

## Traceability to the seven input requirements

| User requirement | Requirements in this spec |
| --- | --- |
| 1. IndexedDB persistence using a clean adapter | FR-1, FR-2, FR-4, FR-5, FR-6, FR-17 |
| 2. Stable device identity across sessions | FR-6, FR-7, FR-8 |
| 3. Atomic batch import with rollback | FR-9, FR-10, FR-11, FR-13, FR-18 |
| 4. Duplicate-safe event persistence | FR-5, FR-12, FR-13, FR-14 |
| 5. Safe handling of concurrent browser tabs | FR-8, FR-15, FR-16, TR-3 |
| 6. Property-based and integration testing | TR-1, TR-2, TR-3, TR-4, TR-5, FR-3 |
| 7. Preserve existing public SDK compatibility | FR-1, FR-2, FR-3, FR-14, FR-18 |

## Acceptance criteria summary

A review-ready implementation of this spec is accepted when all of the following hold:

1. A separate adapter implements `EventStore`; importing `@carrysync/core` does not pull Dexie/IndexedDB.
2. Events keyed by `[app, id]` and the device UUID survive a browser/database reopen.
3. A failed/conflicting/aborted `update` commits nothing; prior events are unchanged.
4. Reimporting an accepted event counts as a duplicate; the store holds exactly one copy per ID.
5. Two tabs writing concurrently lose no accepted batch; a cross-tab conflict rejects one whole batch.
6. Shared contract tests pass for memory and IndexedDB; property tests match memory vs IndexedDB;
   real-browser reopen + concurrent-tab tests pass in Chromium; a simulated quota failure maps to
   `STORAGE_FAILED`.
7. Existing `@carrysync/core` exports keep their signatures/behavior; `npm run check` stays green and
   existing fast-check seeds/counterexamples are preserved.

## Open decisions for design review

These are flagged for your review in `design.md`, not silently decided:

- **D1.** Adapter location: a new `packages/carrysync-indexeddb` workspace package (recommended, matches
  the docs) vs. a `@carrysync/core/indexeddb` subpath export. The recommendation keeps the DB dependency
  physically out of core's install graph.
- **D2.** Dexie vs. raw IndexedDB for the adapter. Recommendation: Dexie (pinned `4.4.7`, Apache-2.0, zero
  runtime deps) for robust transaction lifetime and schema versioning; raw IndexedDB is the zero-dep
  alternative at the cost of more boilerplate and the transaction-auto-commit gotcha.
- **D3.** Whether to export `toCarrySyncError` (or an equivalent `mapStorageError`) from `@carrysync/core`
  so adapters reuse the exact error-mapping logic. This is the only candidate change to core's public
  surface, and it is strictly additive (new export, no signature change). Recommendation: export it.
- **D4.** How real-browser IndexedDB tests are hosted: a lead-owned minimal test harness page driven by
  Playwright (recommended, keeps app UI untouched) vs. temporarily wiring the app pages to IndexedDB.
