# Phase 2 recovery and implementation

Date: **2026-11-02 (Asia/Dhaka)**. Active project root: `/home/risat/VS-Files/Hackathon/carrysync-kit/carrysync-kit`. Branch: `feature/core-sdk`. The outer historical checkout was inspected but never modified. Nothing was merged into `main`.

## Preservation and authorship

The first change was a reviewed checkpoint: **`df2f7985608191a2c046c02685c63775f7842fae` — `wip: preserve Kiro Phase 2 implementation`**, pushed to `origin/feature/core-sdk` with upstream tracking. It preserves the exact incoming Kiro specifications, task metadata, package scaffold/lockfile additions, core's additive error export, shared contract suite, Dexie schema, initial identity implementation and original tests.

Kiro's original artifacts are `.kiro/specs/persistent-offline-sync/{requirements.md,design.md,tasks.md,tasks.meta.json}`. `requirements.md` and `tasks.meta.json` remain untouched after the checkpoint. Codex updated only the design/checklist to reflect current work, with explicit recovery notes; no execution IDs or timestamps were invented in Kiro metadata. The historical Day 1 plan remains labeled as history.

Codex completed the storage adapter, strengthened identity integrity and blocked-open handling, added persistence/error/property/browser verification, updated package scripts/build order and documented public APIs and teammate integration. This is Codex execution, not Kiro-assisted implementation evidence.

## Implemented behavior and architecture

D1–D4 remain intact: separate **`@carrysync/indexeddb`** npm workspace, **Dexie 4.4.7**, unchanged additive **`mapStorageError`**, and a dedicated lead-owned **Playwright harness**, without application UI edits.

- `IndexedDbEventStore(db = openDb())` implements the unchanged EventStore port. Events are keyed by `[app,id]`; reads validate wrapper keys/content, isolate apps, deduplicate, sort and detach results.
- One event readwrite transaction covers read → synchronous transform → full validation → app-range replacement. Async/non-array callback results reject before writes. Invalid/conflicting client imports and storage failures commit nothing.
- `getOrCreateDeviceId(db)` serializes create-if-absent inside one identity transaction, remains stable through page/DB reopen and same-profile Chrome restart, and returns one identity across independent concurrent connections. Corrupt identity fails safely rather than silently rotating.
- Existing domain `CarrySyncError` objects pass through unchanged. Other persistent-adapter/storage failures use generic `STORAGE_FAILED`; low-level exposed Dexie methods retain their own errors. A blocked opener closes/rejects rather than waiting indefinitely; retry with a fresh instance after releasing the blocker.
- Schema **v1 only**, default DB `carrysync-v1`; populated no-op v1 reopen is tested. Future actual migrations must preserve event keys/content and identity or abort, and need their own upgrade-specific tests.
- Both app folders are unchanged. The existing demos still use memory stores. A Hinglish async adapter initialization/disposal handoff is in `docs/frontend-handoff.md`; the teammate owns applying it.

The adapter implements replacement at the storage port, matching memory; normal `client.importPayload` operations supply conflict-checked union. Compatible event-set convergence remains conditional on consistent ID/content, not full CRDT or application-state convergence.

## Executed validation

| Command or suite | Result |
| --- | --- |
| Incoming checkpoint baseline: `npm ci && npm run check` | 42 existing tests passed; typecheck/lint/both app builds/public core import passed |
| `npm ci` | Clean reproducible install passed |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | Passed for core, adapter, both apps, unit tests, tooling and harness |
| `npm test` | **66 passed** across 7 files, **0 failed / 0 skipped** |
| Original fast-check properties | **4 × 300** compatible-set cases passed, original seed `20261102` |
| New IndexedDB fast-check properties | **2 × 100** cases passed, seeds `20261103` (Unicode/mixed-app/duplicate count equivalence) and `20261104` (conflicting batches with unchanged storage) |
| `npm run test:browser` | **9 passed**, **0 failed / 0 skipped**: 3 original app QR tests + 6 dedicated real-Chromium storage tests |
| `npm run build` | Built core, adapter ESM/declarations, FieldLedger and QuizRelay |
| `npm run verify:import` | Public core + adapter imports, persistent identity/reopen/duplicate flow, and isolated core-only consumer passed |
| `npm run check` | All lint/typecheck/unit/property/build/import checks passed together |
| `npm audit --omit=dev` | **0 production vulnerabilities** |

The full dependency installation still reports **11 moderate development-tool findings** through the previously documented minimatch advisory; no incompatible forced upgrade was made. Dexie and fake-indexeddb use Apache-2.0; no new dependencies were added by Codex beyond Kiro's preserved versions.

### What the browser tests actually verify

Real Chromium loads the built workspace packages in the dedicated harness, not a mock storage engine. It tests page reload, database close/reopen, a full Chrome process restart using the same disk profile, concurrent compatible imports and a conflicting-batch race on the **same origin/database**. A BroadcastChannel barrier registers both tabs before simultaneous import. Conflicting races accept exactly one whole batch and leave no partial losing records.

Additional real-IDB tests abort a transaction or inject a quota error during writes **after app-range deletion has begun**; prior committed data and device UUID remain intact. Quota failures are simulated — no real disk was filled. Node tests use fake-indexeddb for shared contracts, denied opening, blocked opening, corrupt rows/identity, concurrency and generated equivalence. These are distinct levels of evidence.

Vitest's core source alias prevents duplicate source/build error-class identities in the shared suite. It does not replace public package verification: Node smoke scripts and browser tests consume built public exports. The isolation script copies only core and its declared dependency graph into an owned temporary directory, asserts Dexie/adapter/fake IndexedDB cannot resolve, and creates/lists an event successfully without `globalThis.indexedDB`.

### Issues found and fixed

The first new test runs exposed fake-IDB import ordering and source/build `CarrySyncError` duplication. Fake globals now load before Dexie, and Vitest uses one core source identity. Assertions were retained; async callback rejection was strengthened. The memory adapter's original raw-transform exception check remains, while the persistent adapter's documented safe mapping is tested separately. Final results above supersede those failed intermediate runs.

## Git and CI

The checkpoint's GitHub Actions run passed: [41446217897](https://github.com/sayedrisat/carrysync-kit/actions/runs/41446217897). This records preservation/baseline verification only. Completion CI must be checked against the final completion commit on the [Actions page](https://github.com/sayedrisat/carrysync-kit/actions); the final execution report states its actual result. Final source review checks staged changes for generated/private files and credential patterns, and verifies `git diff df2f798 -- apps` is empty.

## Completion boundary and next milestone

**Phase 2's approved SDK/storage scope is complete.** The remaining app adapter swap is an explicitly deferred teammate integration; camera acquisition, two-phone scanning and installed PWA/airplane-mode operation remain unimplemented/unverified. No physical phone or Kiro hook execution is claimed. Future actual schema upgrades and storage retention/quota policies also remain separate tasks.

Proceed to **Phase 3: real QR camera scanning and two-phone transfer** by coordinating app adapter initialization, scanner permission/lifecycle and explicit import review. Validate both transfer directions and duplicate/conflict behavior on two phones. Offline asset availability after airplane-mode reopen requires the separate PWA work as well as durable data; current storage tests alone do not establish it.
