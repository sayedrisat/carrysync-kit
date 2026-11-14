import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createEvent, deserializePayload, serializeEvents, type SyncEvent } from '@carrysync/core';
import {
  InMemoryAnswerKeyStore, buildAnswerSubmission, createQuizRelayService, findSubmission, getStudentQuiz,
  gradeQuiz, listQuizzes, listUnmatchedResponses, prepareQuiz, type AnswerKey, type QuizDraft,
} from '../src/quiz-relay/index.js';
import { at, deviceA, deviceB, deviceC, memoryClient, shuffle, uuid } from './helpers.js';

const draft: QuizDraft = {
  title: '  Fractions   check ',
  questions: [
    { prompt: '1/2 + 1/4 = ?', options: ['3/4', '2/6', '1/8'], correctOptionIndex: 0 },
    { prompt: 'Which is larger?', options: ['2/3', '3/5'], correctOptionIndex: 0 },
    { prompt: '0.25 as a fraction', options: ['1/5', '1/4', '2/5', '1/3'], correctOptionIndex: 1 },
  ],
};
const QUIZ_ID = '30000000-0000-4000-8000-000000000001';
const fixedNow = new Date('2026-11-14T08:00:00.000Z');

function publishedEvent(): { event: SyncEvent; key: AnswerKey } {
  const prepared = prepareQuiz(draft, { quizId: QUIZ_ID, now: fixedNow });
  return { event: { ...createEvent('quiz-relay', deviceA, prepared.publish), id: uuid(1, '2'), createdAt: at(0) } as SyncEvent, key: prepared.answerKey };
}

function response(index: number, participantId: string, answers: [string, number][], minute: number, quizId = QUIZ_ID): SyncEvent {
  return {
    app: 'quiz-relay', type: 'quiz.answered', id: uuid(index, '4'), deviceId: participantId, createdAt: at(minute),
    data: { quizId, participantId, answers: answers.map(([questionId, optionIndex]) => ({ questionId, optionIndex })) },
  };
}

describe('QuizRelay publishing and confidentiality', () => {
  it('splits a draft into a public quiz input and a private answer key', () => {
    const prepared = prepareQuiz(draft, { quizId: QUIZ_ID, now: fixedNow });
    expect(prepared.publish).toEqual({
      type: 'quiz.published',
      data: {
        quizId: QUIZ_ID, title: 'Fractions check',
        questions: [
          { id: 'q1', prompt: '1/2 + 1/4 = ?', options: ['3/4', '2/6', '1/8'] },
          { id: 'q2', prompt: 'Which is larger?', options: ['2/3', '3/5'] },
          { id: 'q3', prompt: '0.25 as a fraction', options: ['1/5', '1/4', '2/5', '1/3'] },
        ],
      },
    });
    expect(prepared.answerKey).toEqual({ quizId: QUIZ_ID, createdAt: fixedNow.toISOString(), questions: [
      { questionId: 'q1', correctOptionIndex: 0 }, { questionId: 'q2', correctOptionIndex: 0 }, { questionId: 'q3', correctOptionIndex: 1 },
    ] });
    expect(prepared.bytes).toBeLessThanOrEqual(1200);
    expect(prepareQuiz(draft).quizId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('never places answer information in the event, QR payload or student view model', () => {
    const { event } = publishedEvent();
    const payload = serializeEvents('quiz-relay', [event]);
    expect(payload).not.toMatch(/correct|answerKey/i);
    const [received] = deserializePayload(payload, 'quiz-relay').events;
    expect(received?.type === 'quiz.published' && received.data.questions.map((q) => Object.keys(q).sort())).toEqual([['id', 'options', 'prompt'], ['id', 'options', 'prompt'], ['id', 'options', 'prompt']]);
    const student = getStudentQuiz([event], QUIZ_ID);
    expect(JSON.stringify(student)).not.toMatch(/correct|answerKey/i);
    expect(Object.keys(student).sort()).toEqual(['eventId', 'publishedAt', 'publisherDeviceId', 'questions', 'quizId', 'title']);
  });

  it.each([
    [{ ...draft, title: ' ' }, 'title'],
    [{ ...draft, questions: [] }, 'questions'],
    [{ ...draft, questions: Array.from({ length: 6 }, () => draft.questions[0]) }, 'questions'],
    [{ ...draft, questions: [{ prompt: 'p', options: ['only'], correctOptionIndex: 0 }] }, 'questions.0.options'],
    [{ ...draft, questions: [{ prompt: 'p', options: ['Yes', ' yes'], correctOptionIndex: 0 }] }, 'questions.0.options'],
    [{ ...draft, questions: [{ prompt: 'p', options: ['a', 'b'], correctOptionIndex: 2 }] }, 'questions.0.correctOptionIndex'],
    [{ ...draft, questions: [{ prompt: 'p', options: ['a', 'b'], correctOptionIndex: 0, answer: 1 }] }, 'questions.0'],
  ])('rejects invalid draft (%#) at field %s', (bad, field) => {
    expect(() => prepareQuiz(bad as QuizDraft)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', details: { field } }));
  });

  it('rejects a schema-valid quiz that can never fit one QR code', () => {
    const long: QuizDraft = { title: 'Long', questions: Array.from({ length: 5 }, (_, i) => ({ prompt: `${i} ${'p'.repeat(150)}`, options: ['a', 'b', 'c', 'd'].map((o) => o.repeat(60)), correctOptionIndex: 0 })) };
    expect(() => prepareQuiz(long)).toThrow(expect.objectContaining({ code: 'EVENT_TOO_LARGE', details: expect.objectContaining({ limit: 1200 }) }));
  });
});

describe('QuizRelay answers', () => {
  const { event } = publishedEvent();
  const quiz = getStudentQuiz([event], QUIZ_ID);

  it('builds complete submissions in question order', () => {
    expect(buildAnswerSubmission(quiz, deviceB, { q3: 1, q1: 0, q2: 1 })).toEqual({
      type: 'quiz.answered',
      data: { quizId: QUIZ_ID, participantId: deviceB, answers: [{ questionId: 'q1', optionIndex: 0 }, { questionId: 'q2', optionIndex: 1 }, { questionId: 'q3', optionIndex: 1 }] },
    });
  });

  it.each([
    [{ q1: 0, q2: 1 }, 'q3'], [{ q1: 0, q2: 2, q3: 0 }, 'q2'], [{ q1: 0.5, q2: 0, q3: 0 }, 'q1'],
    [{ q1: 0, q2: 0, q3: 0, q9: 1 }, 'q9'], [{ q1: -1, q2: 0, q3: 0 }, 'q1'],
  ])('rejects invalid choices %j at %s', (choices, questionId) => {
    expect(() => buildAnswerSubmission(quiz, deviceB, choices)).toThrow(expect.objectContaining({ code: 'INVALID_ANSWER', details: { quizId: QUIZ_ID, questionId } }));
  });

  it('requires a UUID participant and handles missing or ambiguous quizzes', () => {
    expect(() => buildAnswerSubmission(quiz, 'student-7', { q1: 0, q2: 0, q3: 0 })).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(() => getStudentQuiz([event], 'missing')).toThrow(expect.objectContaining({ code: 'QUIZ_NOT_FOUND' }));
    const rival = { ...event, id: uuid(2, '2'), data: { ...(event.type === 'quiz.published' ? event.data : {}), title: 'Other' } } as SyncEvent;
    expect(() => getStudentQuiz([event, rival], QUIZ_ID)).toThrow(expect.objectContaining({ code: 'AMBIGUOUS_QUIZ' }));
    expect(listQuizzes([event, rival])[0]?.status).toBe('ambiguous');
    const copy = { ...event, id: uuid(3, '2'), createdAt: at(5) } as SyncEvent;
    expect(getStudentQuiz([copy, event], QUIZ_ID).eventId).toBe(event.id);
  });
});

describe('QuizRelay grading', () => {
  const { event, key } = publishedEvent();
  const all = [
    event,
    response(1, deviceB, [['q1', 0], ['q2', 0], ['q3', 1]], 10), // 3/3 counted
    response(2, deviceB, [['q1', 1], ['q2', 1], ['q3', 0]], 11), // superseded resubmission
    response(3, deviceC, [['q1', 0], ['q2', 1], ['q3', 3]], 12), // 1/3 counted
    response(4, uuid(9, '5'), [['q1', 0], ['q2', 3], ['q3', 1]], 13), // q2 out of range → invalid
    response(5, uuid(9, '5'), [['q1', 2], ['q2', 1], ['q3', 1]], 14), // first valid → counted 1/3
    response(6, uuid(8, '5'), [['q1', 0], ['zz', 1]], 15), // unknown + missing → invalid
    response(7, deviceB, [['q1', 0]], 16, 'unknown-quiz'),
  ];

  it('scores the earliest valid submission per participant and reports the rest', () => {
    const results = gradeQuiz(all, key);
    expect(results.counted.map((s) => [s.participantId, s.score, s.percent])).toEqual([
      [deviceB, 3, 100], [deviceC, 1, 33.3], [uuid(9, '5'), 1, 33.3],
    ]);
    expect(results.submissions.map((s) => [s.eventId, s.status, s.issues])).toEqual([
      [uuid(1, '4'), 'counted', []], [uuid(2, '4'), 'superseded', []], [uuid(3, '4'), 'counted', []],
      [uuid(6, '4'), 'invalid', ['MISSING_ANSWER', 'UNKNOWN_QUESTION']],
      [uuid(4, '4'), 'invalid', ['OPTION_OUT_OF_RANGE']], [uuid(5, '4'), 'counted', []],
    ]);
    expect(results.summary).toEqual({
      participantCount: 4, countedCount: 3, supersededCount: 1, invalidCount: 2,
      averageScore: 1.67, averagePercent: 55.6, highestScore: 3, lowestScore: 1,
    });
    expect(results.questions.map((q) => [q.questionId, q.correctCount, q.correctRate, q.optionCounts])).toEqual([
      ['q1', 2, 0.6667, [2, 0, 1]], ['q2', 1, 0.3333, [1, 2]], ['q3', 2, 0.6667, [0, 2, 0, 1]],
    ]);
    expect(results.submissions[0]?.answers[0]).toEqual({ questionId: 'q1', selectedOptionIndex: 0, correctOptionIndex: 0, isCorrect: true });
  });

  it('reports responses for quizzes not on this device and checks key consistency', () => {
    expect(listUnmatchedResponses(all).map((r) => r.quizId)).toEqual(['unknown-quiz']);
    expect(findSubmission(all, QUIZ_ID, deviceB)?.eventId).toBe(uuid(1, '4'));
    expect(listQuizzes(all, { localDeviceId: deviceA })[0]).toMatchObject({ participantCount: 4, publishedByThisDevice: true, status: 'ready' });
    expect(() => gradeQuiz(all, { ...key, questions: key.questions.slice(1) })).toThrow(expect.objectContaining({ code: 'ANSWER_KEY_MISMATCH' }));
    expect(() => gradeQuiz(all, { ...key, questions: key.questions.map((q) => ({ ...q, correctOptionIndex: 3 })) })).toThrow(expect.objectContaining({ code: 'ANSWER_KEY_MISMATCH' }));
    expect(() => gradeQuiz([all[1] as SyncEvent], key)).toThrow(expect.objectContaining({ code: 'QUIZ_NOT_FOUND' }));
    expect(gradeQuiz([event], key).summary).toMatchObject({ countedCount: 0, averageScore: 0, highestScore: null });
  });

  it('property: grading is independent of event order and duplicate imports', () => {
    const answer = fc.tuple(fc.integer({ min: 0, max: 2 }), fc.integer({ min: 0, max: 1 }), fc.integer({ min: 0, max: 3 }));
    fc.assert(fc.property(fc.array(fc.record({ who: fc.integer({ min: 0, max: 4 }), answer, minute: fc.integer({ min: 1, max: 9 }) }), { maxLength: 25 }), fc.integer(), (rows, seed) => {
      const evs = [event, ...rows.map((r, i) => response(i + 1, uuid(r.who, '6'), [['q1', r.answer[0]], ['q2', r.answer[1]], ['q3', r.answer[2]]], r.minute))];
      const base = gradeQuiz(evs, key);
      expect(gradeQuiz(shuffle(evs, seed), key)).toEqual(base);
      expect(gradeQuiz([...evs, ...shuffle(evs, seed + 7)], key)).toEqual(base);
      expect(base.counted.length).toBe(new Set(rows.map((r) => r.who)).size);
      for (const s of base.submissions) expect(s.score).toBeLessThanOrEqual(s.total);
    }), { seed: 20261116, numRuns: 150 });
  });
});

describe('QuizRelay services: teacher → student → teacher over QR text', () => {
  it('publishes, transfers, answers once, returns and grades', async () => {
    const teacherKeys = new InMemoryAnswerKeyStore();
    const teacher = createQuizRelayService({ client: memoryClient('quiz-relay', deviceA), deviceId: deviceA, answerKeys: teacherKeys });
    const student = createQuizRelayService({ client: memoryClient('quiz-relay', deviceB), deviceId: deviceB, answerKeys: new InMemoryAnswerKeyStore() });

    const published = await teacher.publishQuiz(draft);
    expect(await teacherKeys.get(published.quiz.quizId)).toMatchObject({ quizId: published.quiz.quizId });
    expect((await teacher.listQuizzes())[0]).toMatchObject({ hasAnswerKey: true, publishedByThisDevice: true, participantCount: 0 });

    const [quizQr] = await teacher.prepareQuizExport(published.quiz.quizId);
    expect(quizQr?.payload).not.toMatch(/correct|answerKey/i);
    const preview = await student.previewImport(quizQr?.payload ?? '');
    expect(preview).toMatchObject({ newQuizCount: 1, newResponseCount: 0, canImport: true });
    await student.importPayload(quizQr?.payload ?? '');

    expect((await student.listQuizzes())[0]).toMatchObject({ hasAnswerKey: false, publishedByThisDevice: false });
    await expect(student.getResults(published.quiz.quizId)).rejects.toMatchObject({ code: 'ANSWER_KEY_MISSING' });
    await expect(student.submitAnswers('missing', {})).rejects.toMatchObject({ code: 'QUIZ_NOT_FOUND' });
    const view = await student.getStudentQuiz(published.quiz.quizId);
    expect(JSON.stringify(view)).not.toMatch(/correct/i);

    const submitted = await student.submitAnswers(view.quizId, { q1: 0, q2: 1, q3: 1 });
    expect(submitted.submission.participantId).toBe(deviceB);
    await expect(student.submitAnswers(view.quizId, { q1: 0, q2: 0, q3: 1 })).rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
    expect((await student.getMySubmission(view.quizId))?.eventId).toBe(submitted.event.id);

    const [responseQr] = await student.prepareResponseExport(view.quizId);
    const back = await teacher.previewImport(responseQr?.payload ?? '');
    expect(back).toMatchObject({ newQuizCount: 0, newResponseCount: 1, unmatchedResponseCount: 0 });
    await teacher.importPayload(responseQr?.payload ?? '');
    const results = await teacher.getResults(view.quizId);
    expect(results.counted).toHaveLength(1);
    expect(results.counted[0]).toMatchObject({ participantId: deviceB, score: 2, total: 3 });
    await expect(teacher.prepareResponseExport()).rejects.toMatchObject({ code: 'EMPTY_SELECTION' });
  });

  it('removes the private key if publishing the event fails, and maps key-store failures', async () => {
    const keys = new InMemoryAnswerKeyStore();
    const client = memoryClient('quiz-relay', deviceA);
    const failing = { ...client, createEvent: async () => { throw new Error('disk'); } };
    const service = createQuizRelayService({ client: failing, deviceId: deviceA, answerKeys: keys });
    await expect(service.publishQuiz(draft)).rejects.toThrow('disk');
    expect(await keys.list()).toEqual([]);

    const broken = { get: async () => { throw new Error('x'); }, save: async () => { throw new Error('x'); }, delete: async () => undefined, list: async () => { throw new Error('x'); } };
    const service2 = createQuizRelayService({ client, deviceId: deviceA, answerKeys: broken });
    await expect(service2.publishQuiz(draft)).rejects.toMatchObject({ code: 'KEY_STORE_FAILED' });
    expect(await client.listEvents()).toEqual([]);
  });

  it('refuses to overwrite a different stored answer key', async () => {
    const keys = new InMemoryAnswerKeyStore();
    const { key } = publishedEvent();
    await keys.save(key);
    await keys.save(structuredClone(key));
    await expect(keys.save({ ...key, questions: key.questions.map((q) => ({ ...q, correctOptionIndex: 1 })) })).rejects.toMatchObject({ code: 'ANSWER_KEY_CONFLICT' });
    await expect(keys.save({ ...key, createdAt: 'yesterday' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
