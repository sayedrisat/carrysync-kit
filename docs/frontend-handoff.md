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

**Proposed, NOT implemented:** teammate apps mein persistent/camera wiring, inventory projection, quiz results/grading, core status subscriptions, multipart QR aur installed offline PWA. Optional camera adapter ka review/confirm API ab implemented hai; neeche Phase 3 integration dekho. UI mock ko real sync proof mat samajhna.

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


## Phase 2 update — persistent adapter ready, UI files unchanged

`@carrysync/indexeddb` ab implemented aur browser-tested hai. Existing app services abhi memory-only hain; unko is phase mein change nahi kiya gaya. Teammate app wiring `feature/frontend` par coordinate karega. Approved core branch se code available hone ke baad dependency manifest mein `"@carrysync/indexeddb": "0.1.0"` add karna, root se `npm install` karke lockfile coordinate karna; package registry par published nahi hai, workspace se resolve hoga.

App service ko async factory se initialize kar sakte ho; component ko loading/error state handle karna hoga:

```ts
import { createClient } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';

export async function initializeCarrySync() {
  const db = openDb('carrysync-v1');
  const store = new IndexedDbEventStore(db);
  try {
    const client = createClient('field-ledger', store, await getOrCreateDeviceId(db));
    return { client, close: () => db.close() };
  } catch (error) {
    db.close();
    throw error; // UI mein CarrySyncError code/message handle karo.
  }
}
```

QuizRelay mein app ID `'quiz-relay'` use karo. Same origin + DB name + browser profile par apps identity share kar sakte hain, lekin events app ID se isolated hain. Current ports `5173` aur `5174` alag origins hain: unki database identity/store bhi alag hogi, jo QR exchange ke liye valid hai. Dono apps same device samajhkar identity equality assume mat karo.

## Phase 3 — JavaScript React camera integration

`@carrysync/camera` compiled JavaScript ES modules export karta hai; JS/JSX React frontend mein TypeScript adopt karna zaroori nahi. UI folders unchanged hain. Teammate apne branch par app dependencies mein `"@carrysync/camera": "0.1.0"` aur `"@carrysync/indexeddb": "0.1.0"` add karke root se `npm install` karega. Lockfile coordinate karna. Development se pehle `npm run build:camera` run karo; core/storage/camera assets build ho jayenge.

Parent service ko pehle async initialize karo (Phase 2 snippet above). Stable `client` aur destination `app` prop pass karo; pending initialization par loading/error UI rakho. Component ek scanner own karega:

```jsx
import { useEffect, useRef, useState } from 'react';
import { CameraScanner } from '@carrysync/camera';
import wasmUrl from '@carrysync/camera/decoder.wasm?url';

export function CameraReceiver({ app, client }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [camera, setCamera] = useState({ state: 'idle' });
  const [transfer, setTransfer] = useState({ state: 'idle' });
  const [text, setText] = useState('');

  useEffect(() => {
    const scanner = new CameraScanner({ app, importer: client, wasmUrl });
    scannerRef.current = scanner;
    const offCamera = scanner.subscribe(setCamera);
    const offImport = scanner.imports.subscribe(setTransfer);
    return () => {
      offCamera(); offImport(); scanner.dispose();
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [app, client]);

  return <>
    <video ref={videoRef} muted playsInline />
    <button disabled={transfer.state === 'importing'} onClick={() => {
      if (videoRef.current) void scannerRef.current?.start(videoRef.current);
    }}>Start camera</button>
    <button onClick={() => scannerRef.current?.stop()}>Stop camera</button>
    <p role="status">{camera.message || camera.state}</p>
    <textarea value={text} onChange={(event) => setText(event.target.value)} aria-label="Scanner text" />
    <button disabled={transfer.state === 'importing'} onClick={() => scannerRef.current?.reviewText(text)}>Review text</button>
    {transfer.state === 'review' && <>
      <pre>{JSON.stringify(transfer.envelope.events, null, 2)}</pre>
      <button onClick={() => { void scannerRef.current?.imports.confirmImport(); }}>Confirm import</button>
      <button onClick={() => scannerRef.current?.imports.clear()}>Cancel</button>
    </>}
    <p role="status">{transfer.message || transfer.state}</p>
  </>;
}
```

FieldLedger mein `app="field-ledger"`, QuizRelay mein `app="quiz-relay"`; client bhi wahi app-bound hona chahiye. Destination switch karte waqt `<CameraReceiver key={app} app={app} client={client} />` se component remount karo taaki old review/status retain na ho. Teacher quiz publish ya student answer banane ka UI/domain flow tum own karte ho; scanner dono apps ke supported core envelopes ko same tarah handle karega.

Camera par QR milte hi stream stop hoti hai; explicit Confirm ke bina store change nahi hota. Valid preview ka matlab conflict-free commit nahi: `CONFLICTING_EVENT` confirmation par aa sakta hai. `duplicate` normal result hai; totals dobara increment mat karo. Error states mein core `WRONG_APPLICATION`, `INVALID_PAYLOAD`, `PAYLOAD_TOO_LARGE` aur camera `PERMISSION_DENIED` / `CAMERA_UNAVAILABLE` ko friendly UI do. No visible QR hona normal scanning state hai.

Start user button se karo. HTTPS/localhost required; phone par plain LAN HTTP camera support nahi deta. Same-origin `decoder.wasm` Vite bundle mein aa jayega; CDN ki zaroorat nahi. `@carrysync/camera/notices?url` ko bhi bundle/link karke decoder attribution rakho. Manual-only screen ke liye `QrImportSession(app, client)` use kar sakte ho; WASM/camera ki zaroorat nahi.

Unmount par dono subscriptions remove aur scanner dispose karo. DB app service own karega; har scanner unmount par shared DB close mat karo. Stop/dispose already-confirmed import ko undo nahi karta. Permission dialog browser API se dismiss nahi hota; late grant ki stream adapter turant release karta hai. Disposed scanner se camera restart ke liye new instance chahiye.

Working plain-JS reference: `packages/carrysync-camera/harness/main.js`, run `npm run dev:camera`. Full contract: [camera-transport.md](camera-transport.md). [Phone acceptance](phone-acceptance.md) abhi manually execute karna baaki hai. Warmed open-page offline flow desktop par tested hai; installed/reopened offline PWA support abhi nahi hai.

`npm run build:indexeddb` core + adapter build karega. `getOrCreateDeviceId` stable UUID deta hai; UUID khud generate karke refresh par replace mat karna. `new IndexedDbEventStore()` default DB bhi use kar sakta hai; public `store.db` lifecycle ke liye available hai. Callback transforms synchronous hain; scanner text `client.importPayload` ko do. Durable storage ready hone ka matlab PWA caching ya airplane-mode reopening ready nahi hai. Physical two-phone camera test Phase 3 mein hoga.


## Merged APIs aur free HTTPS test handoff (2026-11-03)

Phase 3 [PR #3](https://github.com/sayedrisat/carrysync-kit/pull/3) se main mein merge ho gaya; Phase 2 storage APIs bhi main par hain. Pehle latest reviewed main ko apne frontend branch mein safely integrate karo; private workspace packages npm registry par published nahi hain. App UI changes is hosting task mein nahi kiye gaye.

| Local package | JavaScript imports / ownership |
| --- | --- |
| `@carrysync/core` | `createClient`, existing event/QR validation/import/error types and functions |
| `@carrysync/indexeddb` | `openDb`, `IndexedDbEventStore`, `getOrCreateDeviceId`; app service owns DB lifetime |
| `@carrysync/camera` | `CameraScanner`, `QrImportSession`; component owns scanner/observer lifetime |
| Camera assets | `@carrysync/camera/decoder.wasm?url` and `@carrysync/camera/notices?url`, bundled on the same origin |

JavaScript service initialization (no TypeScript required):

```js
import { createClient } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';
import { CameraScanner } from '@carrysync/camera';
import wasmUrl from '@carrysync/camera/decoder.wasm?url';

export async function initializeSync(app) {
  const db = openDb('carrysync-v1');
  try {
    const client = createClient(app, new IndexedDbEventStore(db), await getOrCreateDeviceId(db));
    return {
      client,
      createScanner: () => new CameraScanner({ app, importer: client, wasmUrl }),
      close: () => db.close(),
    };
  } catch (error) {
    db.close();
    throw error;
  }
}
// FieldLedger: await initializeSync('field-ledger')
// QuizRelay:   await initializeSync('quiz-relay')
```

Upar wala React example use karo: stable client prop, explicit user Start, render `review` events, phir Confirm. Unmount par both unsubscribe + `scanner.dispose()`; shared DB ko scanner component unmount par close mat karo. `QrImportSession` manual-only fallback bhi deta hai. Import status ko inspect karo; normal errors states mein aate hain, automatic success assume mat karo.

Free hosted harness target: **https://sayedrisat.github.io/carrysync-kit/**. Page par source commit aur local device UUID visible hain. Hosting origin change hone se IndexedDB store/identity alag honge; localhost ke records hosted origin mein automatically appear nahi honge. Same origin par app IDs events ko isolate karte hain. No server/API keys required.

[Concise phone checklist](phone-acceptance.md) aur [blank evidence template](templates/phone-test-evidence.md) use karo. Phone tests abhi unexecuted hain; static HTTPS availability ya desktop synthetic camera pass ko two-phone/PWA proof mat bolna. [Deployment guide](https-deployment.md) mein same-origin WASM/assets, rebuild aur fallback instructions hain.
