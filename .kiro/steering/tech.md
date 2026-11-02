---
inclusion: always
---
# TypeScript conventions

Use Node 24 LTS, npm 11, strict TypeScript and ESM with explicit `.js` relative imports in core. Discriminated unions model events and statuses; Zod validates every untrusted boundary. Avoid `any`, unchecked casts and non-null assumptions in core logic. Keep pure event-set operations independent of storage and React.

Use cryptographically random UUID event IDs. Preserve original IDs on transfer; timestamps are metadata, not authority. Version the envelope and reject unknown versions. Compare normalized validated content with canonical key ordering; order event sets deterministically by ID. Reject conflicting ID content rather than pick a clock-based winner.

Keep dependencies small and pinned with the root lockfile. TypeScript must remain within the supported typescript-eslint peer range. Build the SDK before consumers. Run `npm run check` after meaningful changes and update public docs when behavior changes.
