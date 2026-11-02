# Public SDK contract — Day 1

Everything under **Implemented** below is exported from `@carrysync/core` (built ESM and TypeScript declarations). Build from the root with `npm run build:core`. Package source internals are not application APIs. This workspace package is not published to the npm registry.

## Implemented types

```ts
type ApplicationId = 'field-ledger' | 'quiz-relay';
type EventBase = { id: string; deviceId: string; createdAt: string };
type SyncEvent = EventBase & (
  | { app: 'field-ledger'; type: 'stock.moved'; data: { productId: string; quantityDelta: number } }
  | { app: 'quiz-relay'; type: 'quiz.published'; data: {
      quizId: string; title: string;
      questions: { id: string; prompt: string; options: string[] }[];
    } }
  | { app: 'quiz-relay'; type: 'quiz.answered'; data: {
      quizId: string; participantId: string;
      answers: { questionId: string; optionIndex: number }[];
    } }
);
// AppEvent<A> selects the union members for app A.
// EventInput<A> selects { type, data } from each member for app A.
type Envelope = { protocol: 'carrysync'; version: 1; app: ApplicationId; events: SyncEvent[] };
type MergeResult = { events: SyncEvent[]; added: number; duplicates: number };
type ImportResult = { added: number; duplicates: number; total: number };
type QrExport = { payload: string; svg: string; bytes: number; eventCount: number };
type ImportStatus =
  | { state: 'idle' }
  | { state: 'success'; result: ImportResult }
  | { state: 'error'; code: ErrorCode; message: string };
```

These are explanatory definitions; import the generated types instead of copying them. Runtime constraints are stricter than primitive TS types; see [architecture](architecture.md). The current create/list/export results use `SyncEvent` rather than narrowing their return type to the application. Narrow by `event.type` when displaying domain data. Compile-time input scoping and runtime import scoping are both enforced.

## Implemented functions

| Export | Input → output | Behavior |
| --- | --- | --- |
| `createEvent<A>(app, deviceId, input)` | `A, string, EventInput<A> → SyncEvent` | Creates and validates an event with random UUID and current ISO timestamp; does not persist |
| `validateEvent(value, app)` | `unknown, ApplicationId → SyncEvent` | Validates and returns a detached normalized object |
| `serializeEvents(app, events)` | `ApplicationId, readonly SyncEvent[] → string` | Validates, canonicalizes, deduplicates and enforces envelope limits |
| `deserializePayload(payload, app)` | `string, ApplicationId → Envelope` | Size/version/schema/application checks; no storage mutation |
| `encodeQrPayload(app, events)` | `ApplicationId, readonly SyncEvent[] → Promise<QrExport>` | Serializes and renders byte-mode QR SVG (M correction, margin 4) |
| `decodeQrPayload(payload, app)` | `string, ApplicationId → Envelope` | Alias of `deserializePayload`; scanner text only |
| `payloadByteLength(payload)` | `string → number` | UTF-8 length |
| `mergeEvents(app, current, incoming)` | `ApplicationId, readonly unknown[], readonly unknown[] → MergeResult` | Validated deterministic union, throws on conflict; pure |
| `createClient<A>(app, store, deviceId)` | `A, EventStore, string → CarrySyncClient<A>` | App-bound façade described below |

`applicationSchema` and `eventSchema` are also public Zod schemas for forms/tools. Prefer `validateEvent` to get structured SDK errors and destination-app enforcement. Constants: `PROTOCOL_VERSION = 1`, `MAX_PAYLOAD_BYTES = 1200`, `MAX_ENVELOPE_EVENTS = 20`. Do not rely on limits to select records silently; export may reject a single oversized quiz.

## Implemented frontend façade

```ts
import { createClient, InMemoryEventStore, CarrySyncError } from '@carrysync/core';

// Session-only demo identity. Persistent device identity is planned with IndexedDB.
const client = createClient('field-ledger', new InMemoryEventStore(), crypto.randomUUID());
const event = await client.createEvent({
  type: 'stock.moved', data: { productId: 'rice', quantityDelta: 5 },
});
const accepted = await client.listEvents();
// Show event to the user and obtain an explicit export action first.
const qr = await client.prepareExport([event]);
// Render qr.svg as an image; do not insert arbitrary scanned strings as HTML.
try {
  const result = await client.importPayload(qr.payload);
  console.log(result); // { added: 0, duplicates: 1, total: 1 }
} catch (error) {
  if (error instanceof CarrySyncError) console.error(error.code, error.message);
}
console.log(client.getStatus()); // last completed import only
console.log(accepted.length);   // 1
```

| Client method | Signature | Semantics |
| --- | --- | --- |
| `createEvent` | `(input: EventInput<A>) => Promise<SyncEvent>` | Validates and atomically inserts; no timestamp-based identity |
| `listEvents` | `() => Promise<SyncEvent[]>` | Detached accepted set, sorted by ID with supplied memory adapter |
| `prepareExport` | `(selected: readonly SyncEvent[]) => Promise<QrExport>` | Pure export; validates selection but does not require it to be already stored |
| `importPayload` | `(text: string) => Promise<ImportResult>` | Fully validates, then atomic merge; any invalid event/conflict rejects the whole batch |
| `getStatus` | `() => ImportStatus` | Detached snapshot of last completed import on this client instance; not network/persistence status |

Incoming duplicates inside one envelope are canonicalized before import; `duplicates` counts already stored unique incoming events. Raw `mergeEvents` counts every repeated incoming occurrence. Status does not report pending operations; UI should maintain its own busy state. With concurrent imports it records the last operation to finish. Error paths leave previously stored events unchanged if the adapter honors its transaction contract.

## Implemented storage port

```ts
interface EventStore {
  list(app: ApplicationId): Promise<SyncEvent[]>;
  update(
    app: ApplicationId,
    transform: (current: readonly SyncEvent[]) => readonly SyncEvent[],
  ): Promise<SyncEvent[]>;
}
```

`new InMemoryEventStore()` implements this contract within one JS realm. The callback is synchronous; adapters must serialize it with read and write, validate the complete result and return detached snapshots. Throwing aborts the operation. `update` can replace a set; ordinary client imports always merge. Treat the supplied adapter as trusted implementation code. There is no IndexedDB implementation yet.

## Structured errors (implemented)

`CarrySyncError extends Error` has readonly `code: ErrorCode` and safe `message`.

| Code | Meaning / UI response |
| --- | --- |
| `INVALID_EVENT` | Event shape/field invalid; show form validation or decline import |
| `INVALID_PAYLOAD` | Bad JSON, envelope, fields, count or schema; no import |
| `PAYLOAD_TOO_LARGE` | More than 1,200 UTF-8 bytes; select fewer records |
| `UNSUPPORTED_VERSION` | Explicit version other than numeric 1; no silent migration |
| `WRONG_APPLICATION` | Envelope/event destination mismatch; open the correct app |
| `CONFLICTING_EVENT` | Same ID with different normalized content; stop and ask for manual review |
| `QR_GENERATION_FAILED` | Rendering failed; retry or select less data |
| `STORAGE_FAILED` | Adapter failed; existing data must remain intact under adapter contract |

No partial import result is returned on failure. Do not log complete scanned payloads or internal storage exceptions. Unknown storage exceptions are mapped to a generic safe message. Missing version is `INVALID_PAYLOAD`; an explicitly unsupported version is `UNSUPPORTED_VERSION`.

## Proposed APIs — NOT implemented

- `IndexedDbEventStore`, `getOrCreateDeviceId()`, migrations and storage health/quota reporting.
- `previewImport(text)`, confirmation tokens and a conflict review UI. Current `importPayload` commits immediately after validation; the developer demo requires an explicit button click.
- `subscribeStatus`, scanner/camera/image acquisition adapters, cancellation and scan permission state.
- `listProducts`, `getInventory`, `publishQuiz`, `getQuizResults` and domain projections/grading.
- Multipart export/reassembly, acknowledgments, signatures/encryption and version migrations.

Frontend prototypes may define proposed presentation interfaces locally. Do not import nonexistent functions from core or display persistence/offline/remote-delivery success using mock responses.
