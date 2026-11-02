# Kiro implementation plan — proposed, not Kiro-generated

Codex prepared this foundation and these steering files. **Kiro has not run here.** No `.kiro/specs/` documents, hooks, custom-agent configuration, screenshots or execution history are presented as Kiro output. The team will run the genuine IDE workflow after official credits/access arrive.

## Exact next Requirements-First prompt

Open the repository in Kiro IDE, choose a new **Requirements-First Feature Spec**, and paste:

> Read README.md, .kiro/steering/*, docs/architecture.md, docs/api-contract.md, docs/development-plan.md, docs/validation.md, and packages/carrysync-core/src/*.ts plus its tests. Create a Requirements-First spec named durable-event-storage for an optional IndexedDB EventStore adapter and persistent device identity shared by FieldLedger and QuizRelay through @carrysync/core. First propose EARS-style requirements and acceptance criteria for review. Preserve the public EventStore contract, browser-independent core imports, application isolation, immutable UUID identity, deterministic compatible event sets, duplicate safety and all-or-nothing validation/conflict rejection. Require one IndexedDB readwrite transaction for read/merge/write, cross-tab concurrency tests, detached snapshots, reopen persistence, versioned migration and safe quota/permission failures. Do not edit teammate-owned app UI or claim offline/PWA/two-phone success. After requirements review, propose design and incremental tasks with unit, property and real-browser tests; implement tasks only through the genuine Kiro workflow and record actual evidence with source commit IDs. Clearly distinguish existing behavior, proposed behavior and verified behavior.

This is a prompt to start future Kiro work, not a record that the spec was executed.

## Proposed requirements

1. WHEN a supported event is accepted, the system SHALL persist its original ID and content without regenerating identity on export/import.
2. WHEN a compatible event is imported again, the store SHALL contain one accepted record for that ID.
3. WHEN any input is malformed, wrong-app, unsupported-version or conflicting, the system SHALL reject the complete batch and preserve the previous stored set.
4. WHEN compatible events arrive in different orders, the system SHALL retain the same normalized, sorted accepted set. This is event-set convergence only.
5. WHEN two tabs write concurrently, the database SHALL serialize a read/merge/write transaction so neither accepted batch is lost.
6. WHEN the browser reopens the database, accepted events and the local device UUID SHALL be retained unless storage was explicitly cleared/evicted.
7. WHEN storage is denied, full or unavailable, the client SHALL expose a safe structured error rather than a false persistence success.
8. WHEN the DB schema changes, a tested migration SHALL preserve existing events or abort safely.
9. WHEN a non-browser consumer imports the base SDK, it SHALL not eagerly require IndexedDB/Dexie/browser globals merely to load the module.
10. WHEN a caller receives a snapshot, mutating it SHALL not mutate committed storage.

PWA caching, camera scanning, domain projections and sensitive-data authenticity are separate specs; storage completion alone is not offline readiness.

## Proposed technical design

- New optional workspace adapter package (for example `@carrysync/indexeddb`), with an explicit dependency on core and optionally Dexie; no forced DB dependency in `@carrysync/core`.
- Versioned events table with compound `[app, id]` key, plus metadata table for durable device UUID and schema metadata.
- `EventStore.update` reads current app events, runs the synchronous validated transform and commits replacement inside one readwrite transaction. Never put unrelated awaits/user interactions between read and write.
- Preserve typed SDK conflict/validation errors; map database-specific details to safe storage messages without payload logging.
- Shared contract tests against memory/fake-indexeddb; real browser tests for reopen, upgrade and multiple connections/tabs. Specify total store size and quota UX before production scale.
- Do not introduce LWW timestamp resolution, silently drop invalid records, or broaden QR limits as part of this storage task.

## Incremental tasks for Kiro to review

- [ ] Inspect current source/tests and produce actual spec artifacts through Kiro.
- [ ] Review EARS acceptance criteria with the lead; refine failure semantics.
- [ ] Review design, transaction lifetime, dependency boundary and migration plan.
- [ ] Extract reusable EventStore contract checks without weakening current tests.
- [ ] Implement adapter and persistent identity with fake-indexeddb tests.
- [ ] Add atomic rollback and cross-application isolation regression cases.
- [ ] Add real browser reopen, migration and concurrent-tab tests.
- [ ] Run lint, typechecks, property tests, public import smoke test and both builds.
- [ ] Document implemented APIs and actual validation evidence; open a reviewed PR.

## Suggested custom agents (proposed responsibilities only)

- **Protocol reviewer:** inspect schema/version/size bounds, trust assumptions and conflict semantics; read-only review until a scoped change is approved.
- **Storage engineer:** implement the optional adapter and contract tests; avoid teammate UI folders.
- **Test reviewer:** expand property generators and transactional/browser tests; report counterexample seeds and failed assertions.
- **Integration reviewer:** check package imports, builds and documentation accuracy; do not publish, invite collaborators or alter remote history automatically.

Configure agents later using the actual installed Kiro version's supported UI/schema; no fake agent configuration is included today.

## Suggested hooks (proposed, not installed or executed)

- On relevant core source/test edits, run scoped Vitest tests and surface failures.
- Before an explicitly requested commit/review, run `npm run check`; include browser checks when storage or transport changes.
- On public API changes, remind the engineer to review `docs/api-contract.md` and frontend handoff.
- On dependency changes, run `npm audit` and review licenses/lockfile changes.

Use non-destructive commands, debounce repeated work, and keep hooks from automatically committing, pushing, deploying or logging sensitive payloads. Configure through Kiro after verifying current hook support.

## Property-based testing strategy

Existing fast-check tests cover idempotence, commutativity, associativity and sequential-order independence for **compatible ID/content sets** at seed `20261102`, 300 cases per property. Extend with generated valid payload data (including Unicode), equal timestamps/distinct UUIDs, random duplicate distributions and interleavings. Check serialization round-trip/canonicalization under the QR byte bound. Generate conflicting IDs separately and require explicit failure plus unchanged storage; do not assert a union law on incompatible content. Compare IndexedDB and memory results for identical generated operations. Preserve shrinking paths/seeds from actual failures in the Kiro evidence log.

## Suggested browser automation / MCP workflow

Use a locally configured browser automation tool or MCP server after inspecting its permissions. Start both Vite apps locally; create/export/render/decode/import, assert stored equality and duplicate behavior. Test transaction/reopen/multi-tab behavior in real browsers. Keep automation on local origins, use public fixtures, and store no tokens or private data in traces. Then perform manual two-phone camera and airplane-mode tests; MCP screenshots do not substitute for physical scanning evidence. No MCP server was configured or used as Kiro in this setup.

## Recording genuine evidence

Only after real Kiro activity, keep the generated spec artifacts and a dated record in `docs/evidence/` with: Kiro version, actual prompt, reviewed requirements/design/task outputs, source commit IDs, commands/results, property seeds and actual screenshots where permitted. State which portions Kiro proposed versus the developer changed. Redact credentials and private payloads. Link failures and unresolved work as well as successes. Do not backdate evidence, relabel Codex work as Kiro, or manufacture hook runs.

Workflow references: [Kiro Requirements-First](https://kiro.dev/docs/specs/feature-specs/requirements-first/) and [Kiro steering](https://kiro.dev/docs/steering/). Review current IDE capabilities before adding real hooks/agents.
