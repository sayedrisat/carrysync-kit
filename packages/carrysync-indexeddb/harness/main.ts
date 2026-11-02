import {
  createClient, mapStorageError, type ApplicationId, type EventInput, type ImportResult,
} from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';
import { Dexie } from 'dexie';

type ImportAttempt =
  | { ok: true; result: ImportResult }
  | { ok: false; code: string; message: string };

let store: IndexedDbEventStore | undefined;
let pendingImport: Promise<ImportAttempt> | undefined;

function currentStore(): IndexedDbEventStore {
  if (!store) throw mapStorageError(undefined);
  return store;
}

async function importPayload(app: ApplicationId, payload: string): Promise<ImportAttempt> {
  try {
    const current = currentStore();
    const client = createClient(app, current, await getOrCreateDeviceId(current.db));
    return { ok: true, result: await client.importPayload(payload) };
  } catch (error) {
    const safe = mapStorageError(error);
    return { ok: false, code: safe.code, message: safe.message };
  }
}

export const harness = {
  async openStore(name: string) {
    store?.db.close();
    store = new IndexedDbEventStore(openDb(name));
    return getOrCreateDeviceId(store.db);
  },
  closeStore() { currentStore().db.close(); },
  async reopenStore() { await currentStore().db.open(); },
  async createEvent(input: EventInput<'field-ledger'>) {
    const current = currentStore();
    return createClient('field-ledger', current, await getOrCreateDeviceId(current.db)).createEvent(input);
  },
  list(app: ApplicationId = 'field-ledger') { return currentStore().list(app); },
  getDeviceId() { return getOrCreateDeviceId(currentStore().db); },
  failNextWrite(kind: 'quota' | 'abort') {
    const db = currentStore().db;
    const failure = () => {
      db.events.hook('creating').unsubscribe(failure);
      if (kind === 'quota') throw new DOMException('private simulated quota details', 'QuotaExceededError');
      Dexie.currentTransaction?.abort();
    };
    db.events.hook('creating', failure);
  },
  importPayload,
  // Register both tabs before broadcasting "go", so imports truly race on shared browser storage.
  armImport(app: ApplicationId, payload: string, barrier: string) {
    const channel = new BroadcastChannel(barrier);
    pendingImport = new Promise<ImportAttempt>((resolve) => {
      channel.onmessage = () => {
        channel.close();
        void importPayload(app, payload).then(resolve);
      };
    });
  },
  finishImport() {
    if (!pendingImport) throw mapStorageError(undefined);
    return pendingImport;
  },
};

export type CarrySyncHarness = typeof harness;
declare global { interface Window { carrysyncTest: CarrySyncHarness } }
window.carrysyncTest = harness;
