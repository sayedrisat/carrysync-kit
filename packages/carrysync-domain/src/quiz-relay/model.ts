import { z } from 'zod';
import {
  MAX_PAYLOAD_BYTES, canonicalJson, mergeEvents, validateEvent,
  type AppEvent, type EventInput, type SyncEvent,
} from '@carrysync/core';
import { DomainError } from '../errors.js';
import { measureExport } from '../export-plan.js';
import { compareChronological, compareText, eventsOfType, roundTo } from '../shared.js';

export const MAX_QUESTIONS = 5;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;

type PublishedEvent = Extract<AppEvent<'quiz-relay'>, { type: 'quiz.published' }>;
type AnsweredEvent = Extract<AppEvent<'quiz-relay'>, { type: 'quiz.answered' }>;
export type QuizPublishInput = Extract<EventInput<'quiz-relay'>, { type: 'quiz.published' }>;
export type QuizAnswerInput = Extract<EventInput<'quiz-relay'>, { type: 'quiz.answered' }>;

export interface QuizQuestionDraft { prompt: string; options: readonly string[]; correctOptionIndex: number }
export interface QuizDraft { title: string; questions: readonly QuizQuestionDraft[] }

/** Teacher-private. Lives only in the answer-key store; never in events, QR payloads or student views. */
export interface AnswerKey {
  quizId: string;
  questions: { questionId: string; correctOptionIndex: number }[];
  createdAt: string;
}

const text = (max: number) => z.string().transform((value) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ')).pipe(z.string().min(1).max(max));
const draftSchema = z.strictObject({
  title: text(80),
  questions: z.array(z.strictObject({
    prompt: text(200),
    options: z.array(text(80)).min(MIN_OPTIONS).max(MAX_OPTIONS)
      .refine((options) => new Set(options.map((option) => option.toLowerCase())).size === options.length, 'Options must be distinct'),
    correctOptionIndex: z.number().int().min(0),
  }).refine((question) => question.correctOptionIndex < question.options.length, { path: ['correctOptionIndex'] }))
    .min(1).max(MAX_QUESTIONS),
});

export const answerKeySchema = z.strictObject({
  quizId: z.string().trim().min(1).max(80),
  questions: z.array(z.strictObject({
    questionId: z.string().trim().min(1).max(80),
    correctOptionIndex: z.number().int().min(0).max(MAX_OPTIONS - 1),
  })).min(1).max(MAX_QUESTIONS)
    .refine((items) => new Set(items.map((item) => item.questionId)).size === items.length),
  createdAt: z.iso.datetime(),
});

const PLACEHOLDER_UUID = '00000000-0000-4000-8000-000000000000';

export interface PreparedQuiz {
  quizId: string;
  /** Pass to `client.createEvent`; contains no answer information. */
  publish: QuizPublishInput;
  /** Save to the private AnswerKeyStore before publishing. */
  answerKey: AnswerKey;
  /** Exact QR payload size of the published quiz. */
  bytes: number;
}

function fieldOf(issue: z.core.$ZodIssue | undefined): string {
  return issue ? issue.path.map(String).join('.') || 'quiz' : 'quiz';
}

/**
 * Validates a teacher draft and splits it into a public quiz event input and a private answer key.
 * quizId is a fresh UUID. Throws EVENT_TOO_LARGE if the quiz can never fit one QR code.
 */
export function prepareQuiz(draft: QuizDraft, options: { quizId?: string; now?: Date } = {}): PreparedQuiz {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) throw new DomainError('INVALID_INPUT', { field: fieldOf(parsed.error.issues[0]) });
  const quizId = options.quizId ?? crypto.randomUUID();
  const createdAt = (options.now ?? new Date()).toISOString();
  const questions = parsed.data.questions.map((question, index) => ({ ...question, id: `q${index + 1}` }));
  const publish: QuizPublishInput = {
    type: 'quiz.published',
    data: { quizId, title: parsed.data.title, questions: questions.map(({ id, prompt, options: choices }) => ({ id, prompt, options: choices })) },
  };
  // UUIDs and toISOString() have fixed lengths, so this provisional event measures exactly.
  const provisional = validateEvent({ ...publish, app: 'quiz-relay', id: PLACEHOLDER_UUID, deviceId: PLACEHOLDER_UUID, createdAt }, 'quiz-relay');
  const { bytes } = measureExport('quiz-relay', [provisional]);
  if (bytes > MAX_PAYLOAD_BYTES) throw new DomainError('EVENT_TOO_LARGE', { quizId, bytes, limit: MAX_PAYLOAD_BYTES });
  const answerKey = validateAnswerKey({
    quizId, createdAt,
    questions: questions.map((question) => ({ questionId: question.id, correctOptionIndex: question.correctOptionIndex })),
  });
  return { quizId, publish, answerKey, bytes };
}

export function validateAnswerKey(value: unknown): AnswerKey {
  const parsed = answerKeySchema.safeParse(value);
  if (!parsed.success) throw new DomainError('INVALID_INPUT', { field: `answerKey.${fieldOf(parsed.error.issues[0])}` });
  return parsed.data;
}

export interface StudentQuestion { id: string; prompt: string; options: string[] }
/** Safe for students: built field-by-field from the public event only. */
export interface StudentQuiz {
  quizId: string;
  title: string;
  questions: StudentQuestion[];
  eventId: string;
  publishedAt: string;
  publisherDeviceId: string;
}

export interface QuizSummary {
  quizId: string;
  title: string;
  questionCount: number;
  publishedAt: string;
  publisherDeviceId: string;
  /** `ambiguous` when different quiz contents share one quizId. */
  status: 'ready' | 'ambiguous';
  /** Distinct participants with at least one response. */
  participantCount: number;
  publishedByThisDevice: boolean;
}

function quizEvents(events: readonly SyncEvent[]) {
  const unique = mergeEvents('quiz-relay', [], events.filter((event) => event.app === 'quiz-relay')).events;
  return { published: eventsOfType(unique, 'quiz.published') as PublishedEvent[], answered: eventsOfType(unique, 'quiz.answered') as AnsweredEvent[] };
}

function groupPublished(published: readonly PublishedEvent[]): Map<string, PublishedEvent[]> {
  const groups = new Map<string, PublishedEvent[]>();
  for (const event of [...published].sort(compareChronological)) {
    groups.set(event.data.quizId, [...(groups.get(event.data.quizId) ?? []), event]);
  }
  return groups;
}

const isAmbiguous = (group: readonly PublishedEvent[]) => new Set(group.map((event) => canonicalJson(event.data))).size > 1;

function toStudentQuiz(event: PublishedEvent): StudentQuiz {
  return {
    quizId: event.data.quizId, title: event.data.title,
    questions: event.data.questions.map((question) => ({ id: question.id, prompt: question.prompt, options: [...question.options] })),
    eventId: event.id, publishedAt: event.createdAt, publisherDeviceId: event.deviceId,
  };
}

/** Newest first. Includes quizzes received from other devices. */
export function listQuizzes(events: readonly SyncEvent[], options: { localDeviceId?: string } = {}): QuizSummary[] {
  const { published, answered } = quizEvents(events);
  return [...groupPublished(published).entries()].map(([quizId, group]) => {
    const first = group[0] as PublishedEvent;
    return {
      quizId, title: first.data.title, questionCount: first.data.questions.length,
      publishedAt: first.createdAt, publisherDeviceId: first.deviceId,
      status: isAmbiguous(group) ? 'ambiguous' as const : 'ready' as const,
      participantCount: new Set(answered.filter((event) => event.data.quizId === quizId).map((event) => event.data.participantId)).size,
      publishedByThisDevice: options.localDeviceId !== undefined && group.some((event) => event.deviceId === options.localDeviceId),
    };
  }).sort((a, b) => compareChronological({ createdAt: b.publishedAt, id: b.quizId }, { createdAt: a.publishedAt, id: a.quizId }));
}

/** Throws QUIZ_NOT_FOUND or AMBIGUOUS_QUIZ. Identical republished copies resolve to the earliest. */
export function getStudentQuiz(events: readonly SyncEvent[], quizId: string): StudentQuiz {
  const group = groupPublished(quizEvents(events).published).get(quizId);
  if (!group || group.length === 0) throw new DomainError('QUIZ_NOT_FOUND', { quizId });
  if (isAmbiguous(group)) throw new DomainError('AMBIGUOUS_QUIZ', { quizId });
  return toStudentQuiz(group[0] as PublishedEvent);
}

/** questionId → selected option index. */
export type AnswerChoices = Readonly<Record<string, number>>;

/** Validates complete answers against the quiz and returns the `quiz.answered` input. */
export function buildAnswerSubmission(quiz: StudentQuiz, participantId: string, choices: AnswerChoices): QuizAnswerInput {
  if (!z.uuid().safeParse(participantId).success) throw new DomainError('INVALID_INPUT', { field: 'participantId' });
  if (choices === null || typeof choices !== 'object') throw new DomainError('INVALID_ANSWER', { quizId: quiz.quizId });
  const known = new Set(quiz.questions.map((question) => question.id));
  for (const questionId of Object.keys(choices)) {
    if (!known.has(questionId)) throw new DomainError('INVALID_ANSWER', { quizId: quiz.quizId, questionId });
  }
  const answers = quiz.questions.map((question) => {
    const optionIndex = Object.hasOwn(choices, question.id) ? choices[question.id] : undefined;
    if (typeof optionIndex !== 'number' || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) {
      throw new DomainError('INVALID_ANSWER', { quizId: quiz.quizId, questionId: question.id });
    }
    return { questionId: question.id, optionIndex };
  });
  return { type: 'quiz.answered', data: { quizId: quiz.quizId, participantId, answers } };
}

export interface ResponseRecord {
  eventId: string;
  quizId: string;
  participantId: string;
  deviceId: string;
  submittedAt: string;
  answers: { questionId: string; optionIndex: number }[];
}

const toRecord = (event: AnsweredEvent): ResponseRecord => ({
  eventId: event.id, quizId: event.data.quizId, participantId: event.data.participantId, deviceId: event.deviceId,
  submittedAt: event.createdAt, answers: event.data.answers.map((answer) => ({ ...answer })),
});

/** All responses for a quiz, chronological. */
export function listResponses(events: readonly SyncEvent[], quizId: string): ResponseRecord[] {
  return quizEvents(events).answered.filter((event) => event.data.quizId === quizId).sort(compareChronological).map(toRecord);
}

/** The participant's earliest response (the one the duplicate policy counts when valid). */
export function findSubmission(events: readonly SyncEvent[], quizId: string, participantId: string): ResponseRecord | undefined {
  return listResponses(events, quizId).find((response) => response.participantId === participantId);
}

/** Responses whose quiz has not been received on this device. */
export function listUnmatchedResponses(events: readonly SyncEvent[]): ResponseRecord[] {
  const { published, answered } = quizEvents(events);
  const quizIds = new Set(published.map((event) => event.data.quizId));
  return answered.filter((event) => !quizIds.has(event.data.quizId)).sort(compareChronological).map(toRecord);
}

export interface GradedAnswer {
  questionId: string;
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  isCorrect: boolean;
}
export type SubmissionStatus = 'counted' | 'superseded' | 'invalid';
export type SubmissionIssue = 'UNKNOWN_QUESTION' | 'MISSING_ANSWER' | 'OPTION_OUT_OF_RANGE';
export interface SubmissionResult {
  eventId: string;
  participantId: string;
  deviceId: string;
  submittedAt: string;
  status: SubmissionStatus;
  issues: SubmissionIssue[];
  score: number;
  total: number;
  percent: number;
  answers: GradedAnswer[];
}
export interface QuestionStat {
  questionId: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  answeredCount: number;
  correctCount: number;
  correctRate: number;
  optionCounts: number[];
}
export interface QuizResults {
  quizId: string;
  title: string;
  questionCount: number;
  /** Counted submission per participant, sorted by participantId. */
  counted: SubmissionResult[];
  /** Every submission (counted, superseded, invalid), sorted by participantId then time. */
  submissions: SubmissionResult[];
  summary: {
    participantCount: number;
    countedCount: number;
    supersededCount: number;
    invalidCount: number;
    averageScore: number;
    averagePercent: number;
    highestScore: number | null;
    lowestScore: number | null;
  };
  questions: QuestionStat[];
}

function checkKeyMatches(quiz: StudentQuiz, key: AnswerKey): Map<string, number> {
  const correct = new Map(key.questions.map((item) => [item.questionId, item.correctOptionIndex]));
  const matches = key.quizId === quiz.quizId && correct.size === quiz.questions.length && quiz.questions.every((question) => {
    const index = correct.get(question.id);
    return index !== undefined && index < question.options.length;
  });
  if (!matches) throw new DomainError('ANSWER_KEY_MISMATCH', { quizId: quiz.quizId });
  return correct;
}

/**
 * Deterministic grading. Policy: per participant, the earliest valid response (createdAt, then event ID)
 * counts; later responses are `superseded`; structurally valid but quiz-inconsistent responses are
 * `invalid` and never count. Results are identical on every device holding the same events and key.
 */
export function gradeQuiz(events: readonly SyncEvent[], answerKey: AnswerKey): QuizResults {
  const key = validateAnswerKey(answerKey);
  const quiz = getStudentQuiz(events, key.quizId);
  const correct = checkKeyMatches(quiz, key);
  const total = quiz.questions.length;
  const countedParticipants = new Set<string>();
  const submissions: SubmissionResult[] = listResponses(events, quiz.quizId).map((response) => {
    const issues = new Set<SubmissionIssue>();
    const selected = new Map(response.answers.map((answer) => [answer.questionId, answer.optionIndex]));
    for (const questionId of selected.keys()) if (!correct.has(questionId)) issues.add('UNKNOWN_QUESTION');
    const answers: GradedAnswer[] = quiz.questions.map((question) => {
      const correctOptionIndex = correct.get(question.id) as number;
      const choice = selected.get(question.id);
      if (choice === undefined) issues.add('MISSING_ANSWER');
      else if (choice >= question.options.length) issues.add('OPTION_OUT_OF_RANGE');
      const selectedOptionIndex = choice === undefined || choice >= question.options.length ? null : choice;
      return { questionId: question.id, selectedOptionIndex, correctOptionIndex, isCorrect: selectedOptionIndex === correctOptionIndex };
    });
    let status: SubmissionStatus = 'invalid';
    if (issues.size === 0) {
      status = countedParticipants.has(response.participantId) ? 'superseded' : 'counted';
      countedParticipants.add(response.participantId);
    }
    const score = status === 'invalid' ? 0 : answers.filter((answer) => answer.isCorrect).length;
    return {
      eventId: response.eventId, participantId: response.participantId, deviceId: response.deviceId,
      submittedAt: response.submittedAt, status, issues: [...issues].sort(compareText),
      score, total, percent: roundTo((score / total) * 100, 1), answers,
    };
  }).sort((a, b) => compareText(a.participantId, b.participantId)
    || compareChronological({ createdAt: a.submittedAt, id: a.eventId }, { createdAt: b.submittedAt, id: b.eventId }));
  const counted = submissions.filter((submission) => submission.status === 'counted');
  const scores = counted.map((submission) => submission.score);
  const questions: QuestionStat[] = quiz.questions.map((question, index) => {
    const optionCounts = question.options.map(() => 0);
    let correctCount = 0;
    for (const submission of counted) {
      const answer = submission.answers[index] as GradedAnswer;
      if (answer.selectedOptionIndex !== null) optionCounts[answer.selectedOptionIndex] = (optionCounts[answer.selectedOptionIndex] ?? 0) + 1;
      if (answer.isCorrect) correctCount += 1;
    }
    return {
      questionId: question.id, prompt: question.prompt, options: [...question.options],
      correctOptionIndex: correct.get(question.id) as number, answeredCount: counted.length, correctCount,
      correctRate: counted.length === 0 ? 0 : roundTo(correctCount / counted.length, 4), optionCounts,
    };
  });
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return {
    quizId: quiz.quizId, title: quiz.title, questionCount: total, counted, submissions,
    summary: {
      participantCount: new Set(submissions.map((submission) => submission.participantId)).size,
      countedCount: counted.length,
      supersededCount: submissions.filter((submission) => submission.status === 'superseded').length,
      invalidCount: submissions.filter((submission) => submission.status === 'invalid').length,
      averageScore: counted.length === 0 ? 0 : roundTo(sum / counted.length, 2),
      averagePercent: counted.length === 0 ? 0 : roundTo((sum / (counted.length * total)) * 100, 1),
      highestScore: scores.length === 0 ? null : Math.max(...scores),
      lowestScore: scores.length === 0 ? null : Math.min(...scores),
    },
    questions,
  };
}
