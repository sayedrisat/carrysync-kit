import type { CarrySyncClient, ImportResult, SyncEvent } from '@carrysync/core';
import { DomainError } from '../errors.js';
import { planExportBatches, renderExportPlan, type ExportOptions, type QrBatch } from '../export-plan.js';
import { previewImport, type ImportPreview } from '../preview.js';
import { createChangeEmitter, type Unsubscribe } from '../shared.js';
import type { AnswerKeyStore } from './answer-keys.js';
import {
  buildAnswerSubmission, findSubmission, getStudentQuiz, gradeQuiz, listQuizzes, listUnmatchedResponses, prepareQuiz,
  type AnswerChoices, type QuizDraft, type QuizResults, type QuizSummary, type ResponseRecord, type StudentQuiz,
} from './model.js';

export type QuizRelayClient = Pick<CarrySyncClient<'quiz-relay'>, 'createEvent' | 'listEvents' | 'prepareExport' | 'importPayload'>;

export interface QuizRelayServiceOptions {
  client: QuizRelayClient;
  /** Persistent device UUID; also the student's pseudonymous participantId (not authentication). */
  deviceId: string;
  answerKeys: AnswerKeyStore;
}

export interface TeacherQuizSummary extends QuizSummary { hasAnswerKey: boolean }

export interface PublishedQuiz {
  event: SyncEvent;
  quiz: StudentQuiz;
  bytes: number;
}

export interface SubmittedAnswers {
  event: SyncEvent;
  submission: ResponseRecord;
}

export interface QuizImportPreview extends ImportPreview {
  newQuizCount: number;
  newResponseCount: number;
  /** New responses for quizzes not present on this device. */
  unmatchedResponseCount: number;
}

export function createQuizRelayService({ client, deviceId, answerKeys }: QuizRelayServiceOptions) {
  const changes = createChangeEmitter();
  const events = () => client.listEvents();
  const keyStoreCall = async <T>(operation: () => Promise<T>): Promise<T> => {
    try { return await operation(); }
    catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError('KEY_STORE_FAILED');
    }
  };

  const service = {
    app: 'quiz-relay' as const,
    deviceId,
    participantId: deviceId,

    // ---- Teacher ----

    /** Saves the private key first, then publishes the public quiz event. A failed publish removes the key. */
    async publishQuiz(draft: QuizDraft): Promise<PublishedQuiz> {
      const prepared = prepareQuiz(draft);
      await keyStoreCall(() => answerKeys.save(prepared.answerKey));
      let event: SyncEvent;
      try {
        event = await client.createEvent(prepared.publish);
      } catch (error) {
        await answerKeys.delete(prepared.quizId).catch(() => undefined);
        throw error;
      }
      changes.emit();
      return { event, quiz: getStudentQuiz([event], prepared.quizId), bytes: prepared.bytes };
    },

    async listQuizzes(): Promise<TeacherQuizSummary[]> {
      const quizzes = listQuizzes(await events(), { localDeviceId: deviceId });
      const keyed = new Set((await keyStoreCall(() => answerKeys.list())).map((key) => key.quizId));
      return quizzes.map((quiz) => ({ ...quiz, hasAnswerKey: keyed.has(quiz.quizId) }));
    },

    /** Throws QUIZ_NOT_FOUND, AMBIGUOUS_QUIZ, ANSWER_KEY_MISSING or ANSWER_KEY_MISMATCH. */
    async getResults(quizId: string): Promise<QuizResults> {
      const current = await events();
      getStudentQuiz(current, quizId);
      const key = await keyStoreCall(() => answerKeys.get(quizId));
      if (!key) throw new DomainError('ANSWER_KEY_MISSING', { quizId });
      return gradeQuiz(current, key);
    },

    /** QR for students: only the public quiz.published event. Answer keys are not events and cannot be included. */
    async prepareQuizExport(quizId: string, options: ExportOptions = {}): Promise<QrBatch[]> {
      const current = await events();
      const quiz = getStudentQuiz(current, quizId);
      const event = current.find((item) => item.id === quiz.eventId) as SyncEvent;
      return renderExportPlan(client, planExportBatches('quiz-relay', [event], options));
    },

    async listUnmatchedResponses(): Promise<ResponseRecord[]> {
      return listUnmatchedResponses(await events());
    },

    // ---- Student ----

    async getStudentQuiz(quizId: string): Promise<StudentQuiz> {
      return getStudentQuiz(await events(), quizId);
    },

    /** One submission per quiz per device: a second attempt throws ALREADY_SUBMITTED. */
    async submitAnswers(quizId: string, choices: AnswerChoices): Promise<SubmittedAnswers> {
      const current = await events();
      const quiz = getStudentQuiz(current, quizId);
      if (findSubmission(current, quizId, deviceId)) throw new DomainError('ALREADY_SUBMITTED', { quizId });
      const event = await client.createEvent(buildAnswerSubmission(quiz, deviceId, choices));
      changes.emit();
      const submission = findSubmission([event], quizId, deviceId) as ResponseRecord;
      return { event, submission };
    },

    async getMySubmission(quizId: string): Promise<ResponseRecord | undefined> {
      return findSubmission(await events(), quizId, deviceId);
    },

    /** QR batches of this device's own responses (one quiz, or all when omitted). */
    async prepareResponseExport(quizId?: string, options: ExportOptions = {}): Promise<QrBatch[]> {
      const own = (await events()).filter((event) => event.type === 'quiz.answered' && event.deviceId === deviceId
        && event.data.participantId === deviceId && (quizId === undefined || event.data.quizId === quizId));
      if (own.length === 0) throw new DomainError('EMPTY_SELECTION', quizId === undefined ? {} : { quizId });
      return renderExportPlan(client, planExportBatches('quiz-relay', own, options));
    },

    // ---- Shared ----

    /** Read-only preview with quiz/response counts. Never writes. */
    async previewImport(text: string): Promise<QuizImportPreview> {
      const current = await events();
      const preview = previewImport('quiz-relay', current, text);
      const knownQuizzes = new Set(listQuizzes([...current, ...preview.newEvents]).map((quiz) => quiz.quizId));
      const responses = preview.newEvents.filter((event) => event.type === 'quiz.answered');
      return {
        ...preview,
        newQuizCount: preview.newEvents.filter((event) => event.type === 'quiz.published').length,
        newResponseCount: responses.length,
        unmatchedResponseCount: responses.filter((event) => event.type === 'quiz.answered' && !knownQuizzes.has(event.data.quizId)).length,
      };
    },

    /** Authoritative import (full revalidation in the store transaction). Usable as a CameraScanner importer. */
    async importPayload(text: string): Promise<ImportResult> {
      const result = await client.importPayload(text);
      if (result.added > 0) changes.emit();
      return result;
    },

    onChange(listener: () => void): Unsubscribe {
      return changes.subscribe(listener);
    },
  };
  return service;
}

export type QuizRelayService = ReturnType<typeof createQuizRelayService>;
