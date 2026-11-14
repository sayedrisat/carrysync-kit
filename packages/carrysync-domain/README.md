# @carrysync/domain

FieldLedger and QuizRelay business logic on top of the unchanged `@carrysync/core` v1 protocol. Compiled ESM + declarations; usable from JavaScript/JSX or TypeScript. Private workspace package (not published). Implemented by Claude Code.

| Entry | Contents | Browser APIs |
| --- | --- | --- |
| `@carrysync/domain` | `DomainError`, `describeError`, `measureExport`, `planExportBatches`, `renderExportPlan`, `previewImport`, `sortChronologically` | none |
| `@carrysync/domain/field-ledger` | movement builder, inventory/history projections, `createFieldLedgerService` | none |
| `@carrysync/domain/quiz-relay` | quiz preparation, student views, answers, grading, `InMemoryAnswerKeyStore`, `createQuizRelayService` | none |
| `@carrysync/domain/indexeddb` | `openFieldLedger`, `openQuizRelay`, `IndexedDbAnswerKeyStore` | IndexedDB (Dexie) |

## Guarantees and policies

- **QR transfer:** `planExportBatches` splits a selection into the fewest chronological batches within the byte budget (default 1,200; pass `maxBytes` for less dense codes). Every batch is an independent, atomic v1 envelope. Scan them in any order, and rescanning one is a harmless duplicate. A single record over budget throws `EVENT_TOO_LARGE`; records are never truncated.
- **Import preview** is read-only and advisory. `importPayload` still revalidates inside the store transaction and can reject the batch (for example `CONFLICTING_EVENT`) if the store changed after the preview.
- **FieldLedger:** product keys are NFKC + trimmed + whitespace-collapsed + lower-cased. Stored and imported events are never rewritten. The display label is the earliest spelling, and new movements reuse it. Balances are computed from the unique accepted set (independent of order and duplicates). Status is `negative` < 0, `out` = 0, `low` ≤ threshold (default 5), else `ok`. `recordMovement` refuses an outgoing movement beyond the local balance (`INSUFFICIENT_STOCK`) unless `{ allowNegative: true }`. Imported movements are never rejected for stock; they surface as warnings.
- **QuizRelay:**
  - Answer keys live only in the separate `carrysync-quiz-keys-v1` database (`AnswerKeyStore`). They never appear in events, QR payloads or `StudentQuiz`, and only the publishing device can grade.
  - `quizId` is a fresh UUID. The participant is the persistent `deviceId` (pseudonymous, not authentication; one student per device).
  - A device can submit once per quiz (`ALREADY_SUBMITTED`). When grading, the earliest *valid* response per participant (by `createdAt`, then event ID) counts. Later ones are `superseded`; quiz-inconsistent ones are `invalid` and never count.
  - Two different quizzes sharing a `quizId` are `AMBIGUOUS_QUIZ`. Responses for absent quizzes are listed by `listUnmatchedResponses`.
- **Errors:** `DomainError` has a `code` and payload-free `details` (`field`, `eventId`, `quizId`, `questionId`, `productKey`, `bytes`, `limit`, `available`). `describeError(error)` gives safe display text for domain, core and camera errors.

## JavaScript / JSX integration

```js
// services/sync.js — create once per page; cache the promise (React StrictMode runs effects twice).
import { openFieldLedger } from '@carrysync/domain/indexeddb';   // QuizRelay: openQuizRelay
let runtime;
export const getFieldLedger = () => (runtime ??= openFieldLedger());
```

```jsx
import { useEffect, useState } from 'react';
import { describeError } from '@carrysync/domain';
import { getFieldLedger } from './services/sync';

export function Inventory() {
  const [service, setService] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let off = () => {};
    getFieldLedger().then(({ service }) => {
      setService(service);
      const refresh = () => service.getInventory().then(setInventory);
      off = service.onChange(refresh);
      void refresh();
    }, (e) => setError(describeError(e).message));
    return () => off();
  }, []);

  async function stockOut(productId, quantity) {
    try { await service.recordMovement({ productId, direction: 'out', quantity }); }
    catch (e) { setError(describeError(e).message); } // e.g. INSUFFICIENT_STOCK, INVALID_INPUT (details.field)
  }
  // inventory.products[i]: { productKey, label, balance, status, totalIn, totalOut, lastMovementAt }
  // inventory.warnings[i]: { code: 'NEGATIVE_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK', label, balance }
  // History: await service.getHistory({ productId }) → newest first with balanceAfter and origin.
  // Share: const qrs = await service.prepareExport(selectedEventIds); render qrs[i].svg as <img>, "1 of N".
}
```

QuizRelay (teacher and student in the same app):

```js
const { service } = await getQuizRelay();               // openQuizRelay() cached like above
const { quiz } = await service.publishQuiz({ title, questions: [{ prompt, options, correctOptionIndex }] });
const [quizQr] = await service.prepareQuizExport(quiz.quizId);  // show to students
const studentView = await service.getStudentQuiz(quizId); // no answer key fields
await service.submitAnswers(quizId, { q1: 0, q2: 3 });    // questionId → option index
const responseQrs = await service.prepareResponseExport(quizId); // student shows these to the teacher
const results = await service.getResults(quizId);        // teacher device only
// results.counted, results.submissions (status/issues), results.summary, results.questions
```

Scanning: both services implement `importPayload`, so pass the service as the camera importer. Imports then trigger `onChange`. Use `previewImport` for the review screen:

```js
const scanner = new CameraScanner({ app: service.app, importer: service, wasmUrl });
const preview = await service.previewImport(text);
// FieldLedger: preview.impact[]   QuizRelay: preview.newQuizCount / newResponseCount / unmatchedResponseCount
// Both: newEvents, duplicateEvents, conflicts, canImport
```

Tests and prototypes can use `createFieldLedgerService({ client, deviceId })` / `createQuizRelayService({ client, deviceId, answerKeys: new InMemoryAnswerKeyStore() })` with a core `InMemoryEventStore` client: real logic, no persistence.
