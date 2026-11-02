# @carrysync/core

Private local ESM workspace package for CarrySync Kit. Build with `npm run build:core` from the repository root. Both applications import its public `.` export with generated TypeScript declarations.

Implemented: strict app-scoped events, v1 JSON envelope, QR SVG encoding/scanner-text decoding, compatible event-set union and atomic session-only memory storage. No browser database, camera scanner, service worker or full CRDT is included.

See [public API](../../docs/api-contract.md), [architecture](../../docs/architecture.md) and [tests](tests/core.test.ts). MIT licensed; not published to npm.
