import type { EventInput } from '@carrysync/core';

// Public demo data only. This fixture is not a synchronization implementation.
export const sampleInput = { type: 'quiz.published', data: { quizId: 'demo-math', title: 'Quick maths', questions: [{ id: 'q1', prompt: '2 + 2?', options: ['3', '4'] }] } } satisfies EventInput<'quiz-relay'>;
