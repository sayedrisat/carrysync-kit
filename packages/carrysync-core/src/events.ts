import { z } from 'zod';
import { CarrySyncError } from './errors.js';

export const applicationSchema = z.enum(['field-ledger', 'quiz-relay']);
export type ApplicationId = z.infer<typeof applicationSchema>;

const label = z.string().trim().min(1).max(80);
const base = {
  id: z.uuid(),
  deviceId: z.uuid(),
  createdAt: z.iso.datetime(),
};

const stockEventSchema = z.strictObject({
  ...base,
  app: z.literal('field-ledger'),
  type: z.literal('stock.moved'),
  data: z.strictObject({
    productId: label,
    quantityDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  }),
});

const quizEventSchema = z.strictObject({
  ...base,
  app: z.literal('quiz-relay'),
  type: z.literal('quiz.published'),
  data: z.strictObject({
    quizId: label,
    title: label,
    questions: z.array(z.strictObject({
      id: label,
      prompt: z.string().trim().min(1).max(200),
      options: z.array(label).min(2).max(4),
    })).min(1).max(5).refine((items) => new Set(items.map((item) => item.id)).size === items.length),
  }),
});

const responseEventSchema = z.strictObject({
  ...base,
  app: z.literal('quiz-relay'),
  type: z.literal('quiz.answered'),
  data: z.strictObject({
    quizId: label,
    participantId: z.uuid(),
    answers: z.array(z.strictObject({ questionId: label, optionIndex: z.number().int().min(0).max(3) }))
      .min(1).max(5).refine((items) => new Set(items.map((item) => item.questionId)).size === items.length),
  }),
});

export const eventSchema = z.discriminatedUnion('type', [stockEventSchema, quizEventSchema, responseEventSchema]);
export type SyncEvent = z.infer<typeof eventSchema>;
export type AppEvent<A extends ApplicationId> = Extract<SyncEvent, { app: A }>;
type InputOf<E> = E extends SyncEvent ? Pick<E, 'type' | 'data'> : never;
export type EventInput<A extends ApplicationId> = InputOf<AppEvent<A>>;

/** Parsing returns a new object: callers cannot mutate a stored event through a reference. */
export function validateEvent(value: unknown, app: ApplicationId): SyncEvent {
  const parsed = eventSchema.safeParse(value);
  if (!parsed.success) throw new CarrySyncError('INVALID_EVENT', 'Event does not match a supported event schema.');
  if (parsed.data.app !== app) throw new CarrySyncError('WRONG_APPLICATION', 'Event belongs to another application.');
  return parsed.data;
}

export function createEvent<A extends ApplicationId>(
  app: A, deviceId: string, input: EventInput<A>,
): SyncEvent {
  return validateEvent({ ...input, app, id: crypto.randomUUID(), deviceId, createdAt: new Date().toISOString() }, app);
}
