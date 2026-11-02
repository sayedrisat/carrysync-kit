import 'fake-indexeddb/auto';
import { describeEventStoreContract } from '../../carrysync-core/tests/event-store.contract.js';
import { IndexedDbEventStore } from '../src/index.js';
import { testDb } from './helpers.js';

describeEventStoreContract('IndexedDbEventStore', () => new IndexedDbEventStore(testDb()), true);
