// @carrysync/indexeddb — IndexedDB-backed persistent event storage adapter.
// Optional package: importing @carrysync/core never loads this module or Dexie.
export { CarrySyncDb, openDb } from './db.js';
export { IndexedDbEventStore } from './store.js';
export { getOrCreateDeviceId } from './identity.js';
