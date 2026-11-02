# Architecture and guarantees

## Ownership and data flow

The two Vite applications depend on the same `@carrysync/core` npm workspace. The core has no React, DOM rendering, server or browser database dependency. Its QR renderer returns SVG text. App components call `src/services/carrysync.ts`; demo fixtures and optional prototype services stay in each app's `src/mocks/`.

```text
App input → createEvent → strict schema → atomic EventStore.update
Selected accepted events → v1 envelope → canonical JSON → byte limit → QR SVG
Scanner text → byte limit → JSON parse → version/schema/app validation
             → deduplicate/check all events → atomic read/merge/write → import result
```

Both developer pages use the real SDK with independent session-only memory stores. Mock event services are optional UI tools; they do not implement validation, synchronization, QR or persistence.

## Event model (implemented)

Every immutable event has a UUID `id`, UUID `deviceId`, ISO UTC `createdAt`, literal `app`, literal `type` and strict `data` object. New IDs come from `crypto.randomUUID()`. The device ID must be supplied by the caller. Timestamps are informational; neither identity nor conflict correctness depends on ordering clocks. Imported UUIDs and timestamps are validated structurally, not authenticated.

| App | Event | Data |
| --- | --- | --- |
| `field-ledger` | `stock.moved` | `productId` (1–80 trimmed characters), nonzero integer `quantityDelta` from −1,000,000 to 1,000,000 |
| `quiz-relay` | `quiz.published` | `quizId`, `title`, 1–5 uniquely identified questions; each has `id`, `prompt` (≤200 characters), 2–4 option strings |
| `quiz-relay` | `quiz.answered` | `quizId`, pseudonymous UUID `participantId`, 1–5 answers with unique `questionId` and `optionIndex` 0–3 |

Other identifier/title/option labels are 1–80 trimmed characters. Zod rejects unknown fields at every object level and normalizes label whitespace. Event content equality uses these **validated, normalized** objects. Answer indices are structurally valid only: checking whether the referenced quiz/question/option exists is a future domain operation. No correct-answer keys or student names are included by default.

## QR protocol v1 (implemented)

```json
{
  "protocol": "carrysync",
  "version": 1,
  "app": "field-ledger",
  "events": [{
    "id": "10000000-0000-4000-8000-000000000001",
    "deviceId": "00000000-0000-4000-8000-000000000001",
    "createdAt": "2026-11-02T00:00:00.000Z",
    "app": "field-ledger",
    "type": "stock.moved",
    "data": { "productId": "demo-rice", "quantityDelta": 5 }
  }]
}
```

The wire string is canonical UTF-8 JSON: keys sorted lexicographically, unique events sorted lexicographically by their exact ID string, array order retained. No base64 wrapper, compression, executable content or migration is involved. Only numeric version `1` is accepted. Envelope app and every event app must match the requested destination. Unknown versions, fields and malformed objects fail closed.

Limits are **1,200 UTF-8 bytes** for the complete text and **1–20 events** before deduplication. Deserialization checks size before JSON parsing; whitespace also counts toward the limit. Export validates first and checks serialized size before QR generation. The event count cap is not a promise that 20 events fit: ordinary events often fit only a few at a time. Large valid quiz events can exceed one QR and are rejected on export. Callers must explicitly select fewer records; no truncation occurs.

`qrcode` renders explicit byte segments with correction level **M** and a **four-module quiet zone**; the library selects symbol version. 1,200 bytes is a conservative software ceiling below the library's documented maximum byte capacity, not a measured phone-scanning reliability guarantee. Dense symbols require physical device testing. Prefer single-event QRs initially. Multipart QR, transfer IDs/checksums and batch acknowledgments are proposed only.

`decodeQrPayload` accepts already decoded scanner **text**. It does not read camera frames. Desktop browser tests independently decode a screenshot of the actual SVG using jsQR, then import the resulting text. That validates software rendering/decoding, not camera optics or two physical devices.

## Deterministic merge semantics (implemented)

`mergeEvents(app, current, incoming)` validates both sets, indexes them by ID, compares canonical validated content and returns a detached, ID-sorted union plus incoming `added` / `duplicates` counts. Identical IDs and identical content count once. Equal IDs with different content throw `CONFLICTING_EVENT`; no winner is chosen by timestamp or import order.

For **compatible sets** (every repeated ID maps to the same normalized content), event-set union is idempotent, commutative and associative. Tests check those laws and reversed sequential import order. Result metadata is operational bookkeeping, not part of the algebra: `added` need not be commutative. Reimporting the same event cannot duplicate its accepted effect because the accepted event exists once; a future projection must compute from this unique set rather than blindly reapply incoming events.

For conflicting sets these laws do not apply. A device can already have accepted one of two incompatible records; rejecting the later batch does not automatically reconcile devices which accepted opposing records. Conflicts require explicit future review/recovery. Rejected batches do not contribute any new records. **There is no claim of unconditional event convergence in the presence of conflicts, full CRDT behavior or application-state convergence.**

Future inventory projections should define overflow, negative-stock policy and deterministic aggregation. Quiz revisions, response selection and grading need separate rules; last-write-wins by wall clock is not specified.

## Storage and offline strategy

`EventStore` exposes asynchronous `list(app)` and atomic `update(app, transform)`. An implementation must provide detached snapshots, per-application isolation, serialized updates and all-or-nothing transactions. `InMemoryEventStore` runs its synchronous transform without yielding between read and commit, validates the result and isolates references. It is safe within one JS realm, not a cross-tab persistent database.

The client parses the entire import before entering the transaction; the transform revalidates merged content against the current store. A transform/validation failure leaves existing memory unchanged. Future adapters must uphold the same contract, not emulate it with separate uncoordinated reads and writes.

**Next implementation:** optional IndexedDB adapter in its own package or subpath; consider Dexie there. Store events by `[app, id]`, persist device identity in metadata, version the DB, and read/merge/write within one `readwrite` transaction spanning relevant stores. Test transaction abort, reopen persistence, concurrent tabs, quota denial and migration using fake-indexeddb plus real browsers. Do not allow an async user callback inside the transaction. The core must remain usable without loading Dexie.

**PWA plan:** app-local manifest/icons and service worker; precache versioned build assets and a navigation fallback; no CDN-dependent assets. Define safe service-worker updates and retention of IndexedDB. Acceptance requires installed/reopened applications in airplane mode, local create/export/import, refresh/reopen persistence and upgrade checks on both phones. There is no service worker, manifest or offline-ready claim in Day 1. Current QR preparation/import algorithms themselves perform no network calls.

## Security and limits

All scanned text is untrusted. Strict schemas, byte bounds, event caps, application scoping and whole-batch rejection limit accidental/malformed imports. Error messages omit payload contents and internal storage exceptions. SVG is rendered from the trusted library through an image URL, never injected as user HTML.

QRs are plaintext and reveal every included field to anyone who sees or photographs them. The developer pages show selected content and an explicit privacy warning; no automatic export of the whole store. Schemas cannot detect a person's name hidden inside a product label. Consumers must minimize data and request deliberate sharing. Never put tokens, passwords, identifiable student data or private inventory in demonstration QRs.

There is no authenticity, sender authorization, signature, encryption, replay authorization policy, revocation, or tamper detection beyond structural validation. An attacker can forge a valid new stock event. Device IDs are correlation metadata, not identity credentials. A future trust model must be agreed before sensitive deployment. Long-lived stores currently have no total-size quota or archive strategy; only each transfer is bounded.

Protocol migrations, durable storage, domain projections, camera acquisition, scan confirmation, duplicate/conflict recovery UX, PWA installation and real device validation remain planned. See [milestones](development-plan.md).

Reference: [qrcode capacities, error correction and API](https://github.com/soldair/node-qrcode).
