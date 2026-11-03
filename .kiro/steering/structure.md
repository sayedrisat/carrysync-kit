---
inclusion: always
---
# Repository architecture

npm workspaces: `packages/carrysync-core` exports `@carrysync/core`; `apps/field-ledger` and `apps/quiz-relay` consume its built ESM package. `packages/carrysync-indexeddb` exports the optional Dexie 4 adapter, identity helper and DB factory; core never depends on it. `packages/carrysync-camera` exports the optional compiled browser camera/review adapter and local WASM; its own plain-JS harness is lead-owned, outside both app folders. One root install and lockfile. Core modules: events, errors, merge, protocol, QR, storage, client. No React/server/database implementation dependencies in base core.

Applications own `src/components`, screens, app-local services and `src/mocks`. Both currently use real SDK adapters with memory storage. Optional mocks are UI-only. Lead owns core, persistence/PWA infrastructure, tests and integration. Teammate owns app UI. Avoid modifying handed-off UI without coordination.

Public contracts live in `docs/api-contract.md`; guarantees in `docs/architecture.md`. Main is reviewed; lead branch `feature/core-sdk`, frontend branch `feature/frontend`. No forced pushes or duplicate repositories.
