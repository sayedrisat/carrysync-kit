import { openQuizRelay } from '@carrysync/domain/indexeddb';

let runtime;

export const getQuizRelay = () => (runtime ??= openQuizRelay());