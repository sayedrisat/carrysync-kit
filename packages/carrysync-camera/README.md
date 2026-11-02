# @carrysync/camera

Optional browser QR camera transport for the existing CarrySync SDK. Compiled **ES modules + declarations** are exported; plain JavaScript/JS React consumers use the same API. No React dependency or camera/decoder dependency is added to `@carrysync/core`.

```js
import { createClient } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';
import { CameraScanner } from '@carrysync/camera';
import wasmUrl from '@carrysync/camera/decoder.wasm?url'; // Vite asset import

const db = openDb('carrysync-v1');
const client = createClient('field-ledger', new IndexedDbEventStore(db), await getOrCreateDeviceId(db));
const scanner = new CameraScanner({ app: 'field-ledger', importer: client, wasmUrl });
const offCamera = scanner.subscribe((state) => { /* render camera/permission state */ });
const offImport = scanner.imports.subscribe((state) => { /* render review/result */ });
await scanner.start(document.querySelector('video')); // explicit button action; HTTPS/localhost
// Camera stops on a decoded QR. Display scanner.imports.getState().envelope for review.
// Explicit user confirmation:
await scanner.imports.confirmImport();
// Manual fallback uses exactly the same core validation:
scanner.reviewText(textFromTextarea);
// Component cleanup:
offCamera(); offImport(); scanner.dispose();
// Database lifetime belongs to the app service; close it only when that service is disposed.
```

Check normal results through discriminated `state` values, not exception catches. A valid review is not a promise that the records will be accepted: core checks conflicts against current storage on confirmation. Mixed new/duplicate batches report `imported` with counts; all-duplicate batches report `duplicate`. No import happens automatically.

Public exports:

- `CameraScanner`: `start(video)`, `stop()`, `dispose()`, `getState()`, `subscribe(listener)`, `reviewText(text)`, and readonly `imports: QrImportSession`.
- `QrImportSession(app, importer)`: `reviewText(text)`, `confirmImport()`, `clear()`, `getState()`, `subscribe(listener)`. Usable without a camera or decoder asset.
- `CameraError` and TypeScript types `CameraErrorCode`, `CameraState`, `CameraScannerOptions`, `PayloadImporter`, `TransferState`.
- Assets `@carrysync/camera/decoder.wasm` and `@carrysync/camera/notices`; bundle/serve both with your application.

Build from the root: `npm run build:camera`. Engineering harness: `npm run dev:camera` → localhost:5176. It is independent of both app UI folders.

Decoder: pinned `barcode-detector@3.2.3` ponyfill backed by `zxing-wasm@3.1.6`. It is lazy, QR-only, same-origin, and configured with an explicit local asset URL; no default CDN fetch is allowed. Use one consistent decoder URL per page. No native BarcodeDetector dependency or global polyfill is required. Reader WASM is approximately 947 KB before compression; it is not part of the 1,200-byte transfer limit. Third-party notices include MIT wrapper licenses and Apache-2.0 decoder attribution.

Lifecycle: video only (no microphone), preferred environment-facing camera, bounded 1920×1080 camera constraints, canvas frames bounded to 960 pixels on the longest side, one decode at a time with 200 ms between attempts. A decoded QR (including invalid text) releases tracks before review/error; another scan requires an explicit start. Multiple visible codes reject rather than choosing one silently. Stop/dispose, pagehide, hidden document, ended tracks and failures clean up owned resources. A permission prompt itself cannot be cancelled by the browser API; stopping invalidates the request and releases a late-granted stream immediately. A late decode cannot reopen a closed session. Dispose is terminal for camera use; manual session methods remain available. Confirmed imports are not cancelled/retracted by camera stop/dispose. Unsubscribe import observers in component cleanup.

Core `decodeQrPayload` validates schema, app, version and 1,200 UTF-8 bytes; core `client.importPayload` owns atomic merge/conflict handling. No protocol or merge engine is duplicated. Preview data and QR are plaintext; review deliberately and use public fixtures only.

See [camera API and integration](../../docs/camera-transport.md), [physical-phone acceptance](../../docs/phone-acceptance.md), and [execution record](../../docs/phase-3-implementation.md). Automated camera tests use synthetic video, not physical phones. Only warmed, already-open pages are checked with browser networking disabled; there is no PWA installation/offline-reopen claim.
