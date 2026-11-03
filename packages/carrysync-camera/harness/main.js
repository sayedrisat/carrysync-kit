// Intentionally plain JavaScript: this exercises the compiled public APIs used by JS React consumers.
import { createClient, CarrySyncError, serializeEvents } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';
import { CameraScanner } from '@carrysync/camera';
import wasmUrl from '@carrysync/camera/decoder.wasm?url';
import noticesUrl from '@carrysync/camera/notices?url';
import { prepareOffline } from './offline.js';

const element = (id) => document.getElementById(id);
element('build-commit').textContent = import.meta.env.CARRYSYNC_BUILD_SHA;
element('decoder-notices').href = noticesUrl;
const parameters = new URL(location.href).searchParams;
const requested = parameters.get('app');
const application = element('app');
const selectionKey = 'carrysync-camera.application.v1';
const validApp = (value) => value === 'field-ledger' || value === 'quiz-relay';
let saved;
try { saved = localStorage.getItem(selectionKey); } catch { /* Storage can be disabled by browser policy. */ }
application.value = validApp(requested) ? requested : validApp(saved) ? saved : 'field-ledger';
function saveSelection() {
  try { localStorage.setItem(selectionKey, application.value); }
  catch { element('selection-status').textContent = 'Application preference could not be saved. Browser storage may be disabled.'; }
}
saveSelection();
// Consume the optional launch override once, so a later dropdown choice survives reload.
if (parameters.has('app')) {
  const url = new URL(location.href);
  url.searchParams.delete('app');
  history.replaceState(null, '', url);
}
const db = openDb(parameters.get('db') || 'carrysync-camera-v1');
const store = new IndexedDbEventStore(db);
let scanner;
let client;
let selected;
let unsubscribe = [];

function errorText(error) {
  return error instanceof CarrySyncError ? `${error.code}: ${error.message}` : 'Operation failed. Retry or use manual text import.';
}
async function refresh() {
  const events = await client.listEvents();
  element('count').textContent = String(events.length);
  element('records').textContent = JSON.stringify(events, null, 2);
}
function cameraState(state) {
  element('camera-status').textContent = state.state === 'error' ? `${state.code}: ${state.message}` : state.state;
}
function transferState(state) {
  element('transfer-status').textContent = state.state === 'error' ? `${state.code}: ${state.message}` :
    state.result ? `${state.state}: ${state.result.added} added, ${state.result.duplicates} duplicate(s), ${state.result.total} total` : state.state;
  element('reviewed').textContent = state.state === 'review' ? JSON.stringify(state.envelope.events, null, 2) : 'No pending import.';
  if (state.state === 'review') {
    try { element('manual').value = serializeEvents(state.envelope.app, state.envelope.events); }
    catch {
      // A compact input can grow when canonicalized. Re-export is optional; original review/confirm remains valid.
      element('manual').value = '';
    }
  }
  element('confirm').disabled = state.state !== 'review';
  application.disabled = state.state === 'importing';
  void refresh().catch((error) => { element('initialization').textContent = errorText(error); });
}
async function initialize() {
  if (scanner?.imports.getState().state === 'importing') return;
  for (const id of ['start', 'stop', 'review', 'cancel', 'sample', 'confirm', 'export']) element(id).disabled = true;
  application.disabled = true;
  unsubscribe.forEach((stop) => stop());
  scanner?.dispose();
  const deviceId = await getOrCreateDeviceId(db);
  element('device-id').textContent = deviceId;
  client = createClient(application.value, store, deviceId);
  scanner = new CameraScanner({ app: application.value, importer: client, wasmUrl });
  unsubscribe = [scanner.subscribe(cameraState), scanner.imports.subscribe(transferState)];
  selected = undefined;
  element('selected').textContent = 'No export selected.';
  element('export').disabled = true;
  element('qr').replaceChildren();
  element('export-text').value = '';
  element('export-info').textContent = '';
  cameraState(scanner.getState());
  transferState(scanner.imports.getState());
  await refresh();
  for (const id of ['start', 'stop', 'review', 'cancel', 'sample']) element(id).disabled = false;
  application.disabled = false;
  element('initialization').textContent = 'Persistent storage ready. Camera permission is requested only when you press Start.';
}
async function action(callback) {
  try { await callback(); } catch (error) { element('initialization').textContent = errorText(error); }
}
async function createSample() {
  const input = application.value === 'field-ledger'
    ? { type: 'stock.moved', data: { productId: 'demo-rice', quantityDelta: 5 } }
    : { type: 'quiz.published', data: { quizId: 'demo-math', title: 'Quick maths', questions: [{ id: 'q1', prompt: '2 + 2?', options: ['3', '4'] }] } };
  selected = await client.createEvent(input);
  element('selected').textContent = JSON.stringify(selected, null, 2);
  element('export').disabled = false;
  await refresh();
}
application.addEventListener('change', () => { saveSelection(); void action(initialize); });
element('start').addEventListener('click', () => { void action(() => scanner.start(element('camera'))); });
element('stop').addEventListener('click', () => scanner.stop());
element('review').addEventListener('click', () => scanner.reviewText(element('manual').value));
element('confirm').addEventListener('click', () => { void action(() => scanner.imports.confirmImport()); });
element('cancel').addEventListener('click', () => scanner.imports.clear());
element('sample').addEventListener('click', () => { void action(createSample); });
element('export').addEventListener('click', () => { void action(async () => {
  if (!selected) return;
  const qr = await client.prepareExport([selected]);
  const image = document.createElement('img');
  image.alt = 'CarrySync transfer QR'; image.width = 440; image.height = 440;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`;
  element('qr').replaceChildren(image);
  element('export-info').textContent = `${qr.bytes} UTF-8 bytes · ${qr.eventCount} event(s)`;
  element('export-text').value = qr.payload;
}); });
window.addEventListener('pagehide', () => {
  scanner?.stop();
  db.close();
});
// BFCache restoration must reopen the connection; camera remains stopped until an explicit action.
window.addEventListener('pageshow', (event) => { if (event.persisted) void action(() => db.open()); });
void action(async () => {
  await initialize();
  // Small harness inspection surface, not shipped as a frontend API.
  window.cameraHarness = {
    cameraState: () => scanner.getState(),
    transferState: () => scanner.imports.getState(),
    events: () => client.listEvents(),
    dispose: () => scanner.dispose(),
    deviceId: () => getOrCreateDeviceId(db),
  };
});
if (import.meta.env.PROD) prepareOffline();
else element('offline-status').textContent = 'Offline installation is available in the built HTTPS/localhost preview, not the Vite development server.';
