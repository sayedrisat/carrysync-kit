# Frontend handoff — FieldLedger aur QuizRelay

CarrySync Kit ka goal simple hai: **same TypeScript SDK, do independent apps, QR ke through chhota structured data exchange**. Transfer ke time server, internet, Bluetooth pairing ya Wi-Fi ki zaroorat nahi honi chahiye. Abhi Day 1 developer demo hai; full inventory/classroom UI aur offline installation baad mein banenge.

## Kaun kya own karega?

- **Lead engineer:** `packages/carrysync-core/`, protocol, validation, event IDs, merging/conflicts, IndexedDB, PWA infrastructure, tests, CI aur integration.
- **Tum:** React components, screens, forms, UX, responsive styling, QR scanner/generator presentation, app-local services aur mock data.
- Core schema/API change chahiye toh pehle lead se contract discuss karo. Core logic ko apps mein copy mat karna. SDK `@carrysync/core` se import hoga.

Abhi ke `App.tsx` pages sirf SDK check karne ke liye hain. Inko apne actual UI se replace kar sakte ho. Scanner library/UX tum integrate karoge; camera se mila **text** real SDK validate karega. UI ke andar merge/serialization engine dobara mat banana.

## Clone, install aur branch

Node 24 LTS + npm 11 use karo. Repository root se ek hi installation karo:

```bash
git clone https://github.com/sayedrisat/carrysync-kit.git
cd carrysync-kit
nvm install
nvm use
npm ci
git switch main
git pull --ff-only origin main
git switch -c feature/frontend
git push -u origin feature/frontend
```

`feature/frontend` agar pehle se hai toh `git fetch origin` ke baad `git switch --track origin/feature/frontend` use karo (agar local branch nahi hai). Local branch already hai toh `git switch feature/frontend`. Existing history ko overwrite ya force-push mat karo. Push permission ke liye lead ko tumhara GitHub username chahiye; abhi koi collaborator invitation send nahi hua hai. Permission aane tak local commits kar sakte ho, ya fork-based PR bana sakte ho.

## Dono apps start karo

Terminal 1, repository root:

```bash
npm run dev:field
# http://127.0.0.1:5173
```

Terminal 2, repository root:

```bash
npm run dev:quiz
# http://127.0.0.1:5174
```

App folders mein separate `npm install` mat karna. Workspace symlink se same SDK milega. Start commands core build kar dete hain. Core edit ho raha ho toh lead `npm run dev:core` watcher chala sakta hai.

## Folder structure

Har app independent hai. Ye recommended structure hai; `pages/`, `hooks/`, `types/` tum zaroorat par add kar sakte ho:

```text
apps/field-ledger/src/       apps/quiz-relay/src/
  components/                 components/   # reusable app UI
  pages/                      pages/        # proposed: app screens
  hooks/                      hooks/        # proposed: presentation hooks
  services/carrysync.ts        services/carrysync.ts
  mocks/sample.ts             mocks/sample.ts
  mocks/mock-event-service.ts  mocks/mock-event-service.ts
  types/                      types/        # proposed: view models
  App.tsx                     App.tsx
```

`services/carrysync.ts` **real SDK adapter** hai, lekin storage abhi memory-only hai. Refresh se records clear ho jaate hain. `mocks/` ke services optional UI prototypes hain; woh sync engine nahi hain aur QR import/export implement nahi karte. Koi mock backend server nahi chahiye.

## Implemented frontend contract

Full types/examples: [api-contract.md](api-contract.md). Ye methods **abhi implemented** hain:

```ts
import { CarrySyncError } from '@carrysync/core';
import { carrysync } from './services/carrysync';

const event = await carrysync.createEvent({
  type: 'stock.moved', data: { productId: 'rice', quantityDelta: 5 },
});
const events = await carrysync.listEvents();
// User ko selected records dikhao; phir explicit Share action par call karo.
const qr = await carrysync.prepareExport([event]);
// qr = { svg, payload, bytes, eventCount }; SVG ko image ki tarah render karo.
try {
  const result = await carrysync.importPayload(qr.payload);
  // { added, duplicates, total }; fail hua toh poora batch reject hota hai.
  console.log(result, carrysync.getStatus(), events.length);
} catch (error) {
  if (error instanceof CarrySyncError) console.error(error.code, error.message);
}
```

QuizRelay ka adapter `'quiz-relay'` app ID use karta hai. Uske `sample.ts` mein `quiz.published` example hai. `quiz.answered` bhi core mein validate hota hai, lekin grading aur quiz-reference checks abhi planned hain. FieldLedger payload QuizRelay mein import nahi hoga.

`createEvent` form values ko validate karke memory store mein insert karta hai. `listEvents` accepted event set deta hai; ye inventory totals ya teacher results nahi hai. `getStatus()` last completed **local import** batata hai, remote delivery ya online/offline status nahi. Busy/pending UI apne component state se handle karo.

Errors ko friendly language mein map karo: `WRONG_APPLICATION` → correct app kholo, `PAYLOAD_TOO_LARGE` → kam records select karo, `CONFLICTING_EVENT` → operation stop karke review dikhao. Invalid scan par success toast mat dikhao. Duplicate import normal hai; inventory ko do baar increment mat karo.

**Proposed, NOT implemented:** persistent IndexedDB adapter, import preview/confirmation API, camera scanner service, inventory projection, quiz results/grading, status subscriptions, multipart QR aur installed offline PWA. UI mock ko in features ka real proof mat samajhna.

## Mocks ke saath UI kaise banao?

`src/mocks/sample.ts` sirf public demo input hai; current developer page isko **real SDK** ke through create karta hai. Optional `createMockEventService()` app ke `src/mocks/mock-event-service.ts` se import kar sakte ho. Ye sirf `createEvent` aur `listEvents` ka matching shape deta hai, validation/persistence/sync nahi.

Presentation component ko `Pick<CarrySyncClient<'field-ledger'>, 'createEvent' | 'listEvents'>` jaisa typed service prop do (QuizRelay mein app ID badal do). Prototype mein mock service inject karo; integration mein same prop par `carrysync` inject karo. QR screens hamesha real adapter use kar sakti hain. Ek screen ka happy-path mock complete ho jaane ka matlab SDK integration complete nahi hai.

QR plaintext hota hai. Names, phone numbers, tokens, passwords ya private student/inventory data fixtures mein mat rakhna. Selected records ka review aur explicit share action rakho. User-scanned text ko `dangerouslySetInnerHTML` mein kabhi mat daalna.

## Git aur integration workflow

Chhote commits rakho, jaise `feat(field-ledger): add product list screen`. App ownership boundary follow karo; lockfile ya SDK dependency change pe lead ke saath coordinate karo. Apne branch par latest main lane ke liye:

```bash
git fetch origin
git merge origin/main
npm ci
npm run check
npm run test:browser
git push
gh pr create --base main --head feature/frontend --title "feat: add frontend screens"
```

PR mein screens, implemented interactions, mock vs real behavior aur checked viewport sizes mention karo. Lead contract aur integration review karega. Main par direct unfinished UI push mat karo. Merge ke baad lead IndexedDB/domain service wire karega; presentation components ko storage implementation jaanna nahi chahiye. Physical phones par transfer test abhi baaki hai.
