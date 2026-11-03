# CarrySync Kit

**One Foundation. Two Applications. Zero Network Required for Data Exchange.**

A reusable offline-first TypeScript synchronization foundation for the team's **Kiroween 2026 / Skeleton Crew** project. Two developers, two independent React applications, one shared SDK.

**Project status: ongoing hackathon development, with Kiro (AWS) and AI assistance.** Work is split between the shared SDK/protocol/storage and frontend application roles. Kiro requirements/specification artifacts and Codex-assisted implementation/verification are recorded separately, with the assistance and responsibilities for each stage identified. See [Phase 2 provenance](docs/phase-2-implementation.md#preservation-and-authorship) and the [team handoff](docs/frontend-handoff.md) for responsibilities and current progress.

## Problem and approach

Inventory teams and classrooms need to exchange small structured records where a server or reliable network is unavailable. CarrySync packages validated immutable events into application-scoped, versioned QR payloads. The receiving application validates the entire batch and merges compatible event sets without duplicating previously accepted events.

QR transfer itself needs no internet, backend, Bluetooth pairing or Wi-Fi. **Phase 3 adds a reusable browser camera adapter, explicit review/import and manual fallback. The existing app demos still use memory stores; the lead-owned camera harness uses persistent storage. Physical phone acceptance and installed offline PWA behavior remain unverified.**

## Applications and architecture

```text
apps/field-ledger ──┐
                   ├── @carrysync/core ── validation / event sets / QR v1
apps/quiz-relay ────┘                 └── EventStore → InMemoryEventStore
                                                   or @carrysync/indexeddb
                                                      (Dexie 4, optional)
```

- **FieldLedger:** future offline product inventory and history UI; the developer page currently creates `stock.moved` events, previews one selected record, exports QR and imports scanner text.
- **QuizRelay:** future teacher/student quiz UI; the developer page creates `quiz.published` events and exercises the same SDK. The SDK also validates pseudonymous `quiz.answered` events.
- **Core:** strict schemas, random event IDs, serialization, QR SVG generation, payload text decoding, conflict rejection, duplicate-safe atomic imports and a storage port. The optional `@carrysync/indexeddb` package adds atomic durable events and device identity without adding Dexie to core.

This guarantees compatible **event-set convergence**, not a general CRDT, inventory projection, grading engine, authentication system or conflict resolution policy.

### Implementation map

| Area | Entry point | Engineering boundary |
| --- | --- | --- |
| Event contracts | [`events.ts`](packages/carrysync-core/src/events.ts) | Application-specific stock/quiz schemas and event creation |
| Wire protocol | [`protocol.ts`](packages/carrysync-core/src/protocol.ts) | Versioned envelopes, event-count and UTF-8 size limits |
| Merge and import | [`merge.ts`](packages/carrysync-core/src/merge.ts), [`client.ts`](packages/carrysync-core/src/client.ts) | Compatible event sets, duplicate detection and atomic store imports |
| Storage port | [`storage.ts`](packages/carrysync-core/src/storage.ts) | SDK interface and memory reference implementation |
| Durable adapter | [`store.ts`](packages/carrysync-indexeddb/src/store.ts), [`identity.ts`](packages/carrysync-indexeddb/src/identity.ts) | Optional IndexedDB transactions and persistent device identity |

Start with the [public API contract](docs/api-contract.md) for integration, and the [validation record](docs/validation.md) for the boundary between automated browser evidence and work still planned. The SDK needs no API keys or server environment variables. QR payloads are plaintext application data; credentials and personal data do not belong in them.

## Stack

Node **24 LTS**, npm 11 workspaces, TypeScript 6 (strict), React 19, Vite 8, Zod 4, `qrcode`, Vitest 5, fast-check, ESLint 10 and Playwright. TypeScript is pinned to the supported typescript-eslint range; one root lockfile governs all workspaces. Core/app runtime dependencies use MIT licenses; the optional Dexie adapter dependency and test-only image decoder `jsqr` use Apache-2.0. No database server or paid service is required.

## Start locally

```bash
git clone https://github.com/sayedrisat/carrysync-kit.git
cd carrysync-kit
nvm install  # optional if Node 24 is already installed
nvm use
npm ci
npm run dev:field  # http://127.0.0.1:5173
```

In a second terminal, from the repository root:

```bash
npm run dev:quiz   # http://127.0.0.1:5174
```

Both app start commands build core first. The separate camera harness starts with `npm run dev:camera` on localhost:5176; its compiled JS camera/storage SDKs are built automatically. When editing core, also run `npm run dev:core` in another terminal. Vite consumes the real workspace package's built ESM exports; no source aliases or separately installed SDK copies are needed. Scripts bind loopback for local development; camera/device hosting and HTTPS setup are future work.

On either developer page: **Create sample event → review its JSON → Generate QR → Validate and import**. Reimporting its own payload reports a duplicate. Copy FieldLedger's payload to QuizRelay to see `WRONG_APPLICATION`.

## Checks

```bash
npm run check          # lint, all typechecks, unit/property tests, SDK + both app builds, public import smoke test
npm test               # SDK tests; fast-check uses reproducible seeds
npm run test:watch
npm run typecheck
npm run build
npm run build:indexeddb # core + optional persistence adapter
npm run build:camera   # core + storage + camera package / local WASM
npm run dev:camera     # lead-owned camera harness, localhost:5176
npm run verify:import
npx playwright install chrome  # only if Google Chrome is absent
npm run test:browser   # starts both apps + storage/camera harnesses; Chrome required
npm audit --omit=dev
```

CI runs `npm ci`, `npm run check` and browser tests on PRs and pushes to `main` / `feature/**`. Browser tests rasterize the **actual generated SVG**, decode it with jsQR, exercise import in independent browser contexts and check cross-application rejection. The storage harness also verifies IndexedDB reload/reopen, full browser restart and shared-tab transaction behavior. Camera tests feed synthetic QR video through actual getUserMedia and the real local WASM decoder for both app formats, require confirmation, check track cleanup and faults, and exercise warmed open-page networking-disabled rescans. This is desktop browser proof; physical phone scanning and airplane-mode PWA operation remain unverified. See [validation](docs/validation.md) for the execution record and known dependency advisory.

## Current status and limits

| Implemented | Planned |
| --- | --- |
| Two independent React/Vite/TS app folders with small developer pages | Teammate's complete application UI |
| Strict stock, quiz publication and answer schemas | Inventory projections, quiz reference checks and grading |
| CarrySync v1, QR SVG rendering, optional browser camera adapter, review/confirm and manual fallback | Teammate scanner UI integration and physical two-phone acceptance |
| 1,200 UTF-8 byte / 20 event envelope limits | Multipart QR and version migration, only if needed |
| Sorted compatible event sets, duplicate detection, atomic conflict rejection | User-mediated conflict recovery |
| Storage interface, memory reference adapter, optional Dexie IndexedDB adapter and durable UUID | Teammate app wiring, future DB schema migrations and retention/quota policy |
| Tests, CI configuration, documentation and Kiro steering | Service worker, installation/reopening and verified offline flows |

Refreshing loses all demo events and regenerates the session device ID. QR content is readable plaintext: review selected records, use pseudonymous IDs and never share secrets or personal data. Application IDs prevent accidental cross-app import, not forgery. Durable persistence is verified in the separate storage harness, and an integration snippet is documented for the teammate. No signatures, encryption, transport acknowledgments or physical multi-device proof are claimed.

**Phase 3 ownership:** camera transport, harness, tests and handoff are Codex work. [Camera API](docs/camera-transport.md) · [Physical-phone acceptance (unexecuted)](docs/phone-acceptance.md) · [Phase 3 execution](docs/phase-3-implementation.md). No teammate app source or genuine Kiro spec metadata changed.

**Kiro preservation:** genuine Kiro Requirements-First specs and unfinished implementation are preserved in checkpoint `df2f798`. Codex completed the remaining Phase 2 implementation and verification. See [.kiro/specs/persistent-offline-sync](.kiro/specs/persistent-offline-sync) and [Phase 2 evidence](docs/phase-2-implementation.md). Kiro metadata is preserved; Codex results are not relabeled as Kiro activity.

## Team and documentation

- Lead engineer owns `packages/carrysync-core`, protocol, storage, PWA infrastructure, tests and integration on `feature/core-sdk`.
- Teammate owns frontend screens and app-local adapters/mocks on `feature/frontend`.
- `main` is the reviewed foundation. See [frontend handoff (Hinglish)](docs/frontend-handoff.md) for exact branch commands.
- [Architecture](docs/architecture.md) · [Public API](docs/api-contract.md) · [Development plan](docs/development-plan.md) · [Kiro implementation plan](docs/kiro-implementation-plan.md)

Tooling references: [Node 24 LTS](https://nodejs.org/en/blog/migrations/v22-to-v24), [Vite requirements](https://vite.dev/guide/), [qrcode API and capacity](https://github.com/soldair/node-qrcode), [Kiro Requirements-First](https://kiro.dev/docs/specs/feature-specs/requirements-first/).

## License

[MIT](LICENSE). The SDK is currently a private workspace package (not published to npm); the source repository is public. The optional adapter workspaces are also unpublished. Camera decoder notices include the MIT wrappers and Apache-2.0 reader attribution.
