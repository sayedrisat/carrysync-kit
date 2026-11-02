---
inclusion: always
---
# Scope boundaries and evidence

Day 1 was implemented by Codex. Kiro later created genuine `persistent-offline-sync` specs and partial storage implementation, preserved in checkpoint `df2f798`; Codex completed Phase 2 recovery and verification. Preserve `tasks.meta.json` without invented Kiro execution entries. The original `docs/kiro-implementation-plan.md` is historical; current ownership/results are in `docs/phase-2-implementation.md`.

Do not build complete teammate UI, introduce a backend/mock server, cloud synchronization, paid services, multipart transport or general-purpose CRDT machinery without a concrete need. IndexedDB is implemented in the optional package; app wiring, PWA and camera work follow separate acceptance criteria. No collaborator invitation without a provided username.

Keep code changes small, preserve existing work, commit only verified foundation/features and never commit credentials. Explicitly mark proposed APIs and remaining device work. Event-set convergence is conditional on compatible content; application-state convergence requires separate domain rules.
