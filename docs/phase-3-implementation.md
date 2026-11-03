# Phase 3 camera transport — Codex implementation record

Date: **2026-11-02 (Asia/Dhaka)**. Repository: `/home/risat/VS-Files/Hackathon/carrysync-kit/carrysync-kit`. Engineering branch: `feature/qr-camera-transport`.

## Phase 2 review and merge

Before Phase 3, Codex reviewed the Phase 2 completion report, core/adapter contract, transaction/error/identity implementation, contract/property/browser tests, branch state and CI. A fresh clean-install verification reproduced 66 unit/property tests and 9 browser tests.

[PR #1](https://github.com/sayedrisat/carrysync-kit/pull/1) was opened from `feature/core-sdk` to `main`, with technical review notes and an explicit self-review comment. Head CI and PR merge-candidate CI passed ([merge-candidate run](https://github.com/sayedrisat/carrysync-kit/actions/runs/41449382246)). Repository permission was ADMIN, no additional approval/protection requirement existed, and no blocking technical finding remained. The PR merged as **`40ccb3bf31b5c6c033b0f7ae028e9b8542074bbe`**. No independent GitHub approval is claimed.

The source `feature/core-sdk` branch was preserved; no branch was deleted or force-pushed. Phase 3 was fast-forwarded to the identical-content Phase 2 merge before its engineering commit. No Phase 3 code was pushed directly to main.

## Implementation

- New optional **`@carrysync/camera`** workspace exports compiled JavaScript ESM + declarations for JS React and TypeScript consumers. Core and IndexedDB source contracts are unchanged.
- `CameraScanner` handles HTTPS/localhost checks, rear-camera preference, video-only permission requests, lifecycle/error states, bounded frames, one decode at a time, and all owned track/listener/timer cleanup.
- Real QR decoding uses pinned **`barcode-detector@3.2.3`** ponyfill / **`zxing-wasm@3.1.6`** reader. It loads lazily from an explicitly configured same-origin WASM asset; global BarcodeDetector is not patched. Local binary and third-party MIT/Apache-2.0 notices are included in built exports and the harness.
- A decoded QR ends capture before review, including malformed/oversized/wrong-app text. Multiple visible codes reject rather than silently selecting one. Explicit Start is required for another scan; a repeated accepted event reports duplicate through core.
- `QrImportSession` serves both camera/manual fallback. It calls existing core `decodeQrPayload` for version/app/schema/size validation and existing `client.importPayload` only after explicit confirmation. There is no duplicate protocol, merge or persistence engine.
- Late permission grants/decode results cannot resurrect a stopped/disposed session. Stop/dispose/pagehide/hidden page/ended tracks and errors release resources. Confirmation is single-flight; new text cannot replace an in-progress import. Already-confirmed imports are not undone by stopping the camera.
- The lead-owned **plain JavaScript harness** lives under `packages/carrysync-camera/harness` on localhost:5176. It uses the real persistent adapter and both app IDs, provides selected public QR export, manual review/fallback, confirmation, safe status, visible device ID and byte counts. App UI folders are untouched.
- Optional trusted-TLS configuration supports future phone acceptance through environment-supplied cert/key paths; no certificates/trust changes/deployment were performed.

Detailed public contract: [camera-transport.md](camera-transport.md). JavaScript React integration and persistent-service lifetime: [frontend-handoff.md](frontend-handoff.md). Physical acceptance is explicitly unexecuted in [phone-acceptance.md](phone-acceptance.md).

## Executed checks

| Check | Actual result |
| --- | --- |
| `npm ci` | Clean reproducible installation |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | All workspaces, unit/browser tests, harness config and tooling passed |
| `npm test` | **95 passed**, 9 files; **0 failed / 0 skipped** |
| Existing generated properties | All original 1,400 generated cases retained/passed at seeds 20261102/20261103/20261104 |
| `npm run test:browser` | **18 passed**, including all 9 Phase 2 regressions; **0 failed / 0 skipped** |
| `npm run build` | Core, IndexedDB, camera ESM/declarations, both apps and camera harness production bundle built |
| `npm run verify:import` | Public core/storage/camera imports, asset/notices resolution and SSR-safe module import passed |
| Core-only temporary consumer | No camera/barcode/WASM/IndexedDB dependencies available; core still imports and operates |
| `npm run check` | Lint, types, unit/property, builds and public-import checks passed together |
| `npm audit --omit=dev` | Zero production vulnerabilities reported |

The previously documented 11 moderate development-tool audit findings remain; no forced incompatible dependency override was applied.

### What browser camera tests prove

Tests generate a public QR image and grayscale Y4M video in an owned temporary directory, then launch real Chromium media capture with the synthetic video device. They exercise actual `getUserMedia` → video/canvas → local WASM decode → core validation → explicit confirmation → real IndexedDB. This is not a mocked QR decode callback.

Both FieldLedger stock and QuizRelay publication payloads pass; no mutation occurs before confirmation. The suite verifies duplicate rescans, wrong-app rejection, malformed and oversized live QR rejection, local decoder network-failure cleanup and explicit successful retry, manual conflict/version/cancel behavior, plain-JS public consumers and narrow layout. Permission-denied/unavailable-camera errors are injected browser faults and labeled simulated.

During successful camera tests, non-harness-origin requests are blocked and observed requests remain same-origin. After decoder/module warm-up and with the existing page kept open, disabling browser networking still permits scan/confirm/duplicate flow without new requests. This is **warmed open-page offline behavior**, not installation, asset precaching or offline reopening.

Unit tests additionally cover concurrent start/confirm guards, UTF-8 bounds, late permission grants, pending decoder initialization, stale frame results, observer reentrancy, visibility/pagehide/track-ended cleanup, ownership-safe preview release and safe errors.

Intermediate failures were fixed: explicit decoder callback typing, a typed Vitest decoder mock and browser element type narrowing. Assertions were retained. Intentional WASM-fetch rejection prints upstream decoder diagnostics in its negative test; it is an expected simulated failure with verified cleanup/retry, not a passing normal camera session.

## Authorship and preserved work

Phase 3 code/tests/handoff are **Codex contributions**, not Kiro activity. Genuine `.kiro/specs/persistent-offline-sync/` files and `tasks.meta.json` remain unchanged. Steering gets only accurate current-context updates. Both `apps/` trees, the pure core source, persistent adapter source and teammate branches are preserved.

Final source review checks for credential patterns/private env files and generated artifacts, confirms protected source/spec paths are unchanged, and checks the remote branch commit after push. The final execution report links the actual completion CI run; the local record does not fabricate a remote result before publishing.

## Unresolved acceptance boundary

No physical two-phone scanning, focus/lighting/dense-code reliability, Android/iOS/Safari coverage, real device permission UX or physical radio-disabled test was performed. Only Chromium is automated. Camera selection UI, production app wiring and domain screens remain teammate work.

No PWA manifest/service worker/install/cache/offline-reopen guarantee is included. If the page/decoder is not already loaded, asset networking is required. Future persistent schema migrations/quotas and cryptographic authenticity/confidentiality remain separate milestones. QR contents remain plaintext and unauthenticated.

The engineering foundation is ready for the exact [physical-phone acceptance sequence](phone-acceptance.md). Record actual device evidence before claiming two-phone offline transport.
