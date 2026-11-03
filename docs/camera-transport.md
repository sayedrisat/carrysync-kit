# Phase 3 camera transport — implemented API

`@carrysync/camera` is a separate browser adapter, not a core protocol change. It depends on the maintained [barcode-detector ponyfill](https://github.com/Sec-ant/barcode-detector) and [zxing-wasm reader](https://github.com/Sec-ant/zxing-wasm), pinned to 3.2.3 and 3.1.6. Their npm release metadata was checked during implementation (October 2026 releases). The decoder is QR-only and uses a bundled same-origin WASM asset, not its upstream default CDN.

## Data flow

```text
User Start → getUserMedia(video only) → video/canvas → library QR decode
 → stop all owned camera tracks → core decodeQrPayload(text, destination app)
 → explicit review → user Confirm → existing core client.importPayload(text)
 → existing IndexedDB EventStore transaction → imported / duplicate / core error

Manual text → same review / confirm path
```

No data is sent to a server. Core's exact version, application, strict schema, envelope/event-count and 1,200-byte UTF-8 bounds are reused. Invalid data never reaches the importer; conflicts with stored events are checked only when core commits the confirmed import. A successful protocol review does not guarantee a conflict-free commit.

## Public compiled JavaScript API

The local workspace exports built ESM with declaration files. It is not published to npm. JavaScript React/Vite consumers do not need TypeScript or private source imports.

```js
import { CameraScanner, QrImportSession } from '@carrysync/camera';
import wasmUrl from '@carrysync/camera/decoder.wasm?url';

// client is the existing app-bound createClient(...) result with a persistent store.
const scanner = new CameraScanner({ app: 'field-ledger', importer: client, wasmUrl });
const unsubscribeCamera = scanner.subscribe(renderCameraState);
const unsubscribeImport = scanner.imports.subscribe(renderTransferState);
await scanner.start(videoElement); // from a deliberate button click

scanner.reviewText(textareaValue); // stops camera and reviews manual text
await scanner.imports.confirmImport(); // explicit user action; check returned state
scanner.imports.clear(); // discard unconfirmed review; no effect during an active import
scanner.stop(); // release camera without disposing the instance
unsubscribeCamera(); unsubscribeImport(); scanner.dispose();

// Manual-only UI needs no WASM configuration or camera access:
const manual = new QrImportSession('field-ledger', client);
manual.reviewText(textareaValue);
await manual.confirmImport();
```

`PayloadImporter` is the structural interface `{ importPayload(payload: string): Promise<ImportResult> }`, fulfilled by the existing core client. Always pass the client for the same destination app. No SDK source signatures changed.

| CameraScanner member | Result / contract |
| --- | --- |
| `start(video: HTMLVideoElement)` | `Promise<CameraState>`; single-flight during initialization, already scanning is idempotent; ordinary camera failures resolve to an error state |
| `stop()` | Invalidates pending permission/frame work; clears timer, listeners, preview and all owned tracks |
| `dispose()` | Terminal for camera start; clears pending review when no import is active and removes camera observers |
| `getState()` | Detached `CameraState` snapshot |
| `subscribe(listener)` | Returns unsubscribe; observe subsequent state changes, call `getState` for initial render |
| `reviewText(text)` | Stops camera, forwards text to the same import session |
| `imports` | Readonly `QrImportSession`; own subscription/confirmation/clear API |

`QrImportSession` exposes `reviewText(text): TransferState`, `confirmImport(): Promise<TransferState>`, `clear(): TransferState`, `getState(): TransferState`, and `subscribe(listener): () => void`. Snapshots are detached. Confirmation is single-flight; a second confirm shares the current Promise. New review/clear actions do not replace an in-flight import. Once settled, pending text is cleared, so a new attempt requires another review. Without a pending review, confirm returns the current state and does not import.

Stopping/disposal cannot roll back a previously confirmed transaction. Keep storage lifetime separate from scanner UI lifetime; unsubscribe both observers on unmount. Manual session methods still work after camera disposal; create a new CameraScanner to restart camera use. Consumer observer exceptions are isolated from import correctness and resource cleanup.

## States and errors

`CameraState`: `idle | requesting | scanning | stopped | disposed`, or `{ state: 'error', code, message }`.

| Camera error code | Meaning |
| --- | --- |
| `INSECURE_CONTEXT` | HTTPS/localhost required; plain LAN HTTP is not sufficient |
| `CAMERA_UNSUPPORTED` | No usable browser media API |
| `PERMISSION_DENIED` | User denial, browser permission or security policy |
| `CAMERA_UNAVAILABLE` | Missing/busy/unreadable camera, unsupported constraints or ended track |
| `CAMERA_FAILED` | Other startup/interruption failure |
| `DECODER_FAILED` | Local decoder asset/init/frame failure; manual fallback remains usable |
| `MULTIPLE_QR_CODES` | More than one code visible; retry with one |
| `IMPORT_BUSY` | Wait for the current confirmed import |
| `SCANNER_DISPOSED` | Attempted camera restart after dispose; terminal state remains disposed |

`TransferState`:

- `{ state: 'idle' }`
- `{ state: 'review', envelope: Envelope }` — strict protocol-valid normalized events, not imported yet.
- `{ state: 'importing' }`
- `{ state: 'imported' | 'duplicate', result: { added, duplicates, total } }`
- `{ state: 'error', code: ErrorCode, message: string }` — existing core errors including invalid QR/payload, oversized input, unsupported version, wrong app, conflicts and storage failure.

No QR visible is a normal scanning condition, not an invalid-QR error. A recognized QR containing unrelated/malformed text reports core `INVALID_PAYLOAD`. Normal camera/import errors are returned as states; catch unexpected application errors separately. The adapter never exposes raw browser/internal exception messages or logs scanned contents.

## Browser resource and asset behavior

Only video is requested; no microphone. Prefer rear camera, request maximum 1920×1080, bound canvas detection to 960 pixels per longest side, and run one decode at a time with 200 ms between attempts. Decoded text ends that camera session before review, even when invalid. Repeated frames therefore cannot continually re-import the same QR. A new explicit scan may produce a duplicate result through the core engine.

Stop/dispose, hidden document/pagehide, track end and errors stop owned tracks and release preview/timers/listeners. A late permission grant is stopped immediately; a late decode is ignored. Browser permission prompts themselves cannot be programmatically dismissed. Do not open multiple scanners on the same video element; cleanup protects a stream attached by another owner, but each component should own one scanner.

Import `@carrysync/camera/decoder.wasm?url` in Vite so build output contains the version-matched reader. Other bundlers can copy `decoder.wasm` to their own public asset directory and supply that URL. The URL must use the same HTTP(S) origin as the page. Use one consistent URL per page because the underlying WASM reader is shared. A failed initialization allows explicit retry.

The package also exports `@carrysync/camera/notices`; keep this MIT/Apache-2.0 attribution with the distributed decoder. The lead-owned harness bundles and links both. Reader WASM is about 947 KB raw / 414 KB gzip in the verified build; QR data remains capped at 1,200 bytes. There is no runtime CDN, global BarcodeDetector polyfill, camera frame upload or scanner backend.

## Scope and integration boundary

Only Chromium is automated so far; Android/iOS camera behavior, focus, density, permission UX and battery/performance require the physical steps in [phone-acceptance.md](phone-acceptance.md). A warmed already-open browser page was tested with networking disabled; decoder assets must already be loaded. No installed PWA, offline reopening, service-worker cache, Safari certification or physical two-phone result is claimed.

Actual teammate UI files were not changed. Apply the JavaScript React and persistent-storage pattern in [frontend-handoff.md](frontend-handoff.md). Core QR generation, event types, merge semantics and payload limits remain unchanged.
