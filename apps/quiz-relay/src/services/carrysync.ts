
import { createClient, InMemoryEventStore } from '@carrysync/core';
import {
  createQuizRelayService,
  InMemoryAnswerKeyStore,
} from '@carrysync/domain/quiz-relay';

// Session-only device identity and event storage for this prototype.
const deviceId = crypto.randomUUID();

export const carrysync = createClient(
  'quiz-relay',
  new InMemoryEventStore(),
  deviceId,
);

// The private answer-key store is separate from the public event store.
export const quizRelay = createQuizRelayService({
  client: carrysync,
  deviceId,
  answerKeys: new InMemoryAnswerKeyStore(),
});
