import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { Dexie } from 'dexie';
import { openDb } from '@carrysync/indexeddb';
import { IndexedDbAnswerKeyStore, openAnswerKeyDb, openFieldLedger, openQuizRelay } from '../src/indexeddb.js';
import { prepareQuiz } from '../src/quiz-relay/index.js';

const names: string[] = [];
const fresh = (label: string) => { const name = `carrysync-domain-${label}-${crypto.randomUUID()}`; names.push(name); return name; };
afterEach(async () => { for (const name of names.splice(0)) await Dexie.delete(name); });

const draft = { title: 'Capitals', questions: [{ prompt: 'Capital of Bangladesh?', options: ['Dhaka', 'Chattogram'], correctOptionIndex: 0 }] };

describe('IndexedDbAnswerKeyStore', () => {
  it('persists keys across reopen, is idempotent and rejects different keys', async () => {
    const name = fresh('keys');
    const { answerKey } = prepareQuiz(draft);
    const store = new IndexedDbAnswerKeyStore(openAnswerKeyDb(name));
    await store.save(answerKey);
    await store.save(structuredClone(answerKey));
    await expect(store.save({ ...answerKey, questions: [{ questionId: 'q1', correctOptionIndex: 1 }] })).rejects.toMatchObject({ code: 'ANSWER_KEY_CONFLICT' });
    store.db.close();
    const reopened = new IndexedDbAnswerKeyStore(openAnswerKeyDb(name));
    expect(await reopened.get(answerKey.quizId)).toEqual(answerKey);
    expect(await reopened.list()).toEqual([answerKey]);
    await reopened.delete(answerKey.quizId);
    expect(await reopened.get(answerKey.quizId)).toBeUndefined();
    reopened.db.close();
  });

  it('fails closed on corrupt or mismatched rows without exposing them', async () => {
    const db = openAnswerKeyDb(fresh('corrupt'));
    const store = new IndexedDbAnswerKeyStore(db);
    const { answerKey } = prepareQuiz(draft);
    await db.answerKeys.put({ quizId: answerKey.quizId, key: { ...answerKey, questions: 'tampered' } as never });
    await expect(store.get(answerKey.quizId)).rejects.toMatchObject({ code: 'KEY_STORE_FAILED', message: expect.not.stringContaining('tampered') });
    await db.answerKeys.put({ quizId: 'other', key: answerKey });
    await expect(store.list()).rejects.toMatchObject({ code: 'KEY_STORE_FAILED' });
    await expect(store.save(answerKey)).rejects.toMatchObject({ code: 'KEY_STORE_FAILED' });
    db.close();
  });
});

describe('persistent bootstraps', () => {
  it('QuizRelay keeps answer keys out of the synchronized event database and survives reopen', async () => {
    const dbName = fresh('events');
    const answerKeyDbName = fresh('private');
    const first = await openQuizRelay({ dbName, answerKeyDbName });
    const { quiz } = await first.service.publishQuiz(draft);
    expect((await first.service.getResults(quiz.quizId)).counted).toEqual([]);
    first.close();

    const raw = openDb(dbName);
    const rows = await raw.events.toArray();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toMatch(/correct|answerKey/i);
    expect(raw.tables.map((table) => table.name).sort()).toEqual(['events', 'identity']);
    raw.close();

    const second = await openQuizRelay({ dbName, answerKeyDbName });
    expect(second.deviceId).toBe(first.deviceId);
    expect((await second.service.listQuizzes())[0]).toMatchObject({ quizId: quiz.quizId, hasAnswerKey: true });
    expect(await second.answerKeys.get(quiz.quizId)).toMatchObject({ questions: [{ questionId: 'q1', correctOptionIndex: 0 }] });
    second.close();

    // Same event store, but a device without the private DB cannot grade.
    const other = await openQuizRelay({ dbName, answerKeyDbName: fresh('empty') });
    await expect(other.service.getResults(quiz.quizId)).rejects.toMatchObject({ code: 'ANSWER_KEY_MISSING' });
    other.close();
  });

  it('FieldLedger persists movements and isolates them from QuizRelay in a shared database', async () => {
    const dbName = fresh('shared');
    const ledger = await openFieldLedger({ dbName, inventory: { lowStockThreshold: 1 } });
    await ledger.service.recordMovement({ productId: 'Rice', direction: 'in', quantity: 3 });
    ledger.close();
    const reopened = await openFieldLedger({ dbName });
    expect((await reopened.service.getInventory()).products).toMatchObject([{ productKey: 'rice', balance: 3 }]);
    const quiz = await openQuizRelay({ dbName, answerKeyDbName: fresh('k') });
    expect(quiz.deviceId).toBe(reopened.deviceId);
    expect(await quiz.service.listQuizzes()).toEqual([]);
    reopened.close();
    quiz.close();
  });
});
