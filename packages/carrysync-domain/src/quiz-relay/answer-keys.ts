import { canonicalJson } from '@carrysync/core';
import { DomainError } from '../errors.js';
import { validateAnswerKey, type AnswerKey } from './model.js';

/**
 * Private teacher storage, deliberately separate from the synchronized event store.
 * Implementations validate on read and write, return detached copies, and never overwrite a
 * different key for the same quiz (ANSWER_KEY_CONFLICT). Saving an identical key is a no-op.
 */
export interface AnswerKeyStore {
  get(quizId: string): Promise<AnswerKey | undefined>;
  save(key: AnswerKey): Promise<void>;
  delete(quizId: string): Promise<void>;
  list(): Promise<AnswerKey[]>;
}

export function sameAnswerKey(a: AnswerKey, b: AnswerKey): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/** Session-only reference implementation (tests, prototypes). */
export class InMemoryAnswerKeyStore implements AnswerKeyStore {
  private readonly keys = new Map<string, AnswerKey>();

  async get(quizId: string): Promise<AnswerKey | undefined> {
    const key = this.keys.get(quizId);
    return key ? validateAnswerKey(key) : undefined;
  }

  async save(key: AnswerKey): Promise<void> {
    const valid = validateAnswerKey(key);
    const existing = this.keys.get(valid.quizId);
    if (existing && !sameAnswerKey(existing, valid)) throw new DomainError('ANSWER_KEY_CONFLICT', { quizId: valid.quizId });
    this.keys.set(valid.quizId, valid);
  }

  async delete(quizId: string): Promise<void> {
    this.keys.delete(quizId);
  }

  async list(): Promise<AnswerKey[]> {
    return [...this.keys.values()].map(validateAnswerKey).sort((a, b) => (a.quizId < b.quizId ? -1 : a.quizId > b.quizId ? 1 : 0));
  }
}
