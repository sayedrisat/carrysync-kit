# Development plan

Estimates below are planning ranges for one engineer, not deadlines. They assume the frontend developer works independently against the documented contracts. Day 1 and Phase 2 storage are implemented. Kiro created the preserved storage spec/partial implementation; Codex completed the recovery and validation. Phase 3 browser camera foundation is also implemented by Codex; physical-phone acceptance and teammate UI wiring remain next.

| Priority / milestone | Dependency | Acceptance criteria | Estimate |
| --- | --- | --- | --- |
| Completed: genuine Kiro Requirements-First storage spec | Kiro IDE/account/credits available; current docs reviewed | Reviewed requirements/design/tasks recorded by real Kiro workflow; guarantees and evidence scope agreed | 2–3 hours |
| Completed: optional IndexedDB adapter and persistent device identity (schema v1) | Storage spec; existing EventStore contract | Atomic read/merge/write; failed batch rolls back; refresh/reopen retains IDs/events; two tabs cannot lose updates; v1 reopen and denied/quota/abort errors tested; real future migrations remain separately scoped | 1–2 days |
| Phase 3 foundation implemented; teammate camera UI wiring pending | Teammate UI skeleton; durable store | HTTPS camera permissions, scanner text handoff, select/review records, errors and duplicate feedback; scanner stream released; manual-text fallback | 1–2 days shared |
| Next: physical two-device acceptance (unexecuted) | Milestones 2–3; two phones and secure local/deployed app origin | Create A → display QR → scan B → event equality → rescan no duplicate → reverse transfer; mixed/invalid/conflicting batch leaves store intact | 0.5–1 day |
| 5. Domain projections and application screens | Accepted event models, frontend contract review | FieldLedger product IDs/totals/history with overflow and stock policy; QuizRelay quiz-reference checks and explicit response/revision/grading semantics; pure projection tests | 2–3 days shared |
| 6. PWA infrastructure and verified offline operation | Built app shell, durable store, device flow | Each app has separate manifest/scope; assets available after airplane-mode reopen; create/export/import on both devices; safe update/DB retention verified | 1–2 days |
| 7. Submission demonstration and evidence | Both apps, Kiro work, physical test results | Authentic Kiro evidence, exact versions/commits, limitations, reproducible demo script, license/dependency review | 0.5–1 day |

Do not solve transport expansion before real measurements show a need. If a useful quiz exceeds 1,200 bytes, first reduce/select content and measure scan reliability. Multipart transport needs a separate spec for frame limits, integrity, ordering, expiry and all-or-nothing reassembly; estimate another 1–2 days only if approved as necessary.

## Branch and integration order

`main` holds the verified initial foundation. The lead continues on `feature/core-sdk`; the teammate starts `feature/frontend` from the latest main. Keep the two app folders independent and reuse the same package. Coordinate schema changes through `docs/api-contract.md`; avoid simultaneous lockfile/dependency edits. Review small PRs and run `npm run check` plus relevant browser checks before merging. No force pushes or unfinished feature merges.

## Durable storage task detail

Implemented in `@carrysync/indexeddb`; core consumers do not load Dexie. The following acceptance checks now have executed tests: Test EventStore contract against memory and IndexedDB: detached snapshots, isolation by app, duplicate-safe update, transform validation, atomic abort, serialized concurrent writers and typed failures. Persist device UUID in metadata; keep event IDs unchanged when re-exporting/importing. Include real browser reopen/concurrent-tab checks beyond fake-indexeddb tests. A database implementation that does separate read and write transactions does not meet acceptance.

## Device/offline evidence checklist

Record date, source commit, phone/OS/browser versions, secure origin, event IDs, byte lengths and actual results (avoid private payloads). For each app, test both transfer directions, rescan, invalid text, wrong app and same-ID conflicting content. Then repeat after airplane-mode reopen with the network disabled. Separate camera success, durable persistence, installed PWA shell and event-set correctness in the report. Desktop screenshot decoding alone cannot satisfy this milestone.

## Scope exclusions

No cloud synchronization, authentication backend, Bluetooth protocol, polished dashboards by the lead, automatic timestamp conflict winner, unconditional CRDT claims, paid deployment or fabricated hackathon/Kiro evidence. Signing/encryption and a sensitive-data threat model require separate design before real private use.
