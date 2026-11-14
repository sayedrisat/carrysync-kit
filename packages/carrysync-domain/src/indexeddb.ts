// Browser persistence for the domain layer. This is the only domain entry point that loads Dexie.
// Answer keys live in their OWN database, never in the synchronized `carrysync-v1` event store,
// so no event-store schema change or migration is needed and keys cannot reach a QR export path.
import { Dexie, type Table } from 'dexie';
import { createClient } from '@carrysync/core';
import { IndexedDbEventStore, getOrCreateDeviceId, openDb } from '@carrysync/indexeddb';
import { DomainError } from './errors.js';
import { createFieldLedgerService, type FieldLedgerService } from './field-ledger/service.js';
import type { InventoryOptions } from './field-ledger/model.js';
import { sameAnswerKey, type AnswerKeyStore } from './quiz-relay/answer-keys.js';
import { validateAnswerKey, type AnswerKey } from './quiz-relay/model.js';
import { createQuizRelayService, type QuizRelayService } from './quiz-relay/service.js';

export const DEFAULT_EVENT_DB = 'carrysync-v1';
export const DEFAULT_ANSWER_KEY_DB = 'carrysync-quiz-keys-v1';

interface AnswerKeyRow { quizId: string; key: AnswerKey }

export class AnswerKeyDb extends Dexie {
  answerKeys!: Table<AnswerKeyRow, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ answerKeys: 'quizId' });
    this.on('blocked', () => { this.close(); return false; });
  }
}

export function openAnswerKeyDb(name = DEFAULT_ANSWER_KEY_DB): AnswerKeyDb {
  return new AnswerKeyDb(name);
}

/** Validates rows on read and fails closed on corruption (never returns an unverified key). */
function readRow(row: AnswerKeyRow | undefined, quizId?: string): AnswerKey | undefined {
  if (!row) return undefined;
  const key = validateAnswerKey(row.key);
  if (row.quizId !== key.quizId || (quizId !== undefined && quizId !== key.quizId)) throw new DomainError('KEY_STORE_FAILED');
  return key;
}

function safe(error: unknown): DomainError {
  return error instanceof DomainError && error.code !== 'INVALID_INPUT' ? error : new DomainError('KEY_STORE_FAILED');
}

export class IndexedDbAnswerKeyStore implements AnswerKeyStore {
  constructor(readonly db: AnswerKeyDb = openAnswerKeyDb()) {}

  async get(quizId: string): Promise<AnswerKey | undefined> {
    try { return readRow(await this.db.answerKeys.get(quizId), quizId); }
    catch (error) { throw safe(error); }
  }

  async save(key: AnswerKey): Promise<void> {
    const valid = validateAnswerKey(key);
    try {
      await this.db.transaction('rw', this.db.answerKeys, async () => {
        const existing = readRow(await this.db.answerKeys.get(valid.quizId), valid.quizId);
        if (existing && !sameAnswerKey(existing, valid)) throw new DomainError('ANSWER_KEY_CONFLICT', { quizId: valid.quizId });
        if (!existing) await this.db.answerKeys.put({ quizId: valid.quizId, key: valid });
      });
    } catch (error) { throw safe(error); }
  }

  async delete(quizId: string): Promise<void> {
    try { await this.db.answerKeys.delete(quizId); }
    catch (error) { throw safe(error); }
  }

  async list(): Promise<AnswerKey[]> {
    try { return (await this.db.answerKeys.toArray()).map((row) => readRow(row) as AnswerKey); }
    catch (error) { throw safe(error); }
  }
}

export interface FieldLedgerRuntime {
  service: FieldLedgerService;
  client: ReturnType<typeof createClient<'field-ledger'>>;
  deviceId: string;
  close(): void;
}

export interface QuizRelayRuntime {
  service: QuizRelayService;
  client: ReturnType<typeof createClient<'quiz-relay'>>;
  deviceId: string;
  answerKeys: IndexedDbAnswerKeyStore;
  close(): void;
}

/** Persistent FieldLedger bootstrap. Cache the returned promise once per page (React StrictMode safe). */
export async function openFieldLedger(options: { dbName?: string; inventory?: InventoryOptions } = {}): Promise<FieldLedgerRuntime> {
  const db = openDb(options.dbName ?? DEFAULT_EVENT_DB);
  try {
    const deviceId = await getOrCreateDeviceId(db);
    const client = createClient('field-ledger', new IndexedDbEventStore(db), deviceId);
    const service = createFieldLedgerService(options.inventory ? { client, deviceId, inventory: options.inventory } : { client, deviceId });
    return { service, client, deviceId, close: () => db.close() };
  } catch (error) {
    db.close();
    throw error;
  }
}

/** Persistent QuizRelay bootstrap with a separate private answer-key database. */
export async function openQuizRelay(options: { dbName?: string; answerKeyDbName?: string } = {}): Promise<QuizRelayRuntime> {
  const db = openDb(options.dbName ?? DEFAULT_EVENT_DB);
  const keyDb = openAnswerKeyDb(options.answerKeyDbName ?? DEFAULT_ANSWER_KEY_DB);
  try {
    const deviceId = await getOrCreateDeviceId(db);
    const client = createClient('quiz-relay', new IndexedDbEventStore(db), deviceId);
    const answerKeys = new IndexedDbAnswerKeyStore(keyDb);
    const service = createQuizRelayService({ client, deviceId, answerKeys });
    return { service, client, deviceId, answerKeys, close: () => { db.close(); keyDb.close(); } };
  } catch (error) {
    db.close();
    keyDb.close();
    throw error;
  }
}
