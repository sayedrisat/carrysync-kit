import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { Dexie } from 'dexie';
import { DomainError, describeError, planExportBatches } from '@carrysync/domain';
import { projectInventory } from '@carrysync/domain/field-ledger';
import { InMemoryAnswerKeyStore, createQuizRelayService } from '@carrysync/domain/quiz-relay';
import { openFieldLedger, openQuizRelay } from '@carrysync/domain/indexeddb';
import { createClient, InMemoryEventStore } from '@carrysync/core';

// Plain JavaScript consumer of the compiled package exports (no TypeScript, no source aliases).
const dbName = `carrysync-domain-import-${crypto.randomUUID()}`;
const keyDbName = `carrysync-domain-keys-${crypto.randomUUID()}`;
try {
  const ledger = await openFieldLedger({ dbName });
  const { event } = await ledger.service.recordMovement({ productId: 'Rice', direction: 'in', quantity: 4 });
  assert.equal(projectInventory(await ledger.client.listEvents()).products[0].balance, 4);
  assert.equal(planExportBatches('field-ledger', [event]).batches.length, 1);
  ledger.close();

  const teacher = await openQuizRelay({ dbName, answerKeyDbName: keyDbName });
  const { quiz } = await teacher.service.publishQuiz({ title: 'Check', questions: [{ prompt: '2 + 2?', options: ['3', '4'], correctOptionIndex: 1 }] });
  const [qr] = await teacher.service.prepareQuizExport(quiz.quizId);
  assert.doesNotMatch(qr.payload, /correct/i);

  const studentId = crypto.randomUUID();
  const student = createQuizRelayService({ client: createClient('quiz-relay', new InMemoryEventStore(), studentId), deviceId: studentId, answerKeys: new InMemoryAnswerKeyStore() });
  await student.importPayload(qr.payload);
  await student.submitAnswers(quiz.quizId, { q1: 1 });
  const [answers] = await student.prepareResponseExport(quiz.quizId);
  await teacher.service.importPayload(answers.payload);
  assert.equal((await teacher.service.getResults(quiz.quizId)).counted[0].score, 1);
  assert.equal(describeError(new DomainError('ALREADY_SUBMITTED')).code, 'ALREADY_SUBMITTED');
  teacher.close();
  console.log('Public @carrysync/domain import verified: persistent services, QR batches, private answer keys and grading.');
} finally {
  await Dexie.delete(dbName);
  await Dexie.delete(keyDbName);
}
