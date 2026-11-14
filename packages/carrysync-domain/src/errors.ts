import { CarrySyncError, type ErrorCode } from '@carrysync/core';

export type DomainErrorCode =
  | 'INVALID_INPUT' | 'EMPTY_SELECTION' | 'EVENT_TOO_LARGE' | 'INSUFFICIENT_STOCK'
  | 'QUIZ_NOT_FOUND' | 'AMBIGUOUS_QUIZ' | 'ANSWER_KEY_MISSING' | 'ANSWER_KEY_MISMATCH' | 'ANSWER_KEY_CONFLICT'
  | 'INVALID_ANSWER' | 'ALREADY_SUBMITTED' | 'KEY_STORE_FAILED';

/** Structured, payload-free context. Never contains answer keys or full QR payloads. */
export interface DomainErrorDetails {
  field?: string;
  eventId?: string;
  quizId?: string;
  questionId?: string;
  productKey?: string;
  bytes?: number;
  limit?: number;
  available?: number;
}

const domainMessages: Record<DomainErrorCode, string> = {
  INVALID_INPUT: 'Some entered values are invalid. Check the highlighted field.',
  EMPTY_SELECTION: 'Select at least one record to share.',
  EVENT_TOO_LARGE: 'This record is too large for one QR code. Shorten its text.',
  INSUFFICIENT_STOCK: 'Not enough stock for this outgoing movement.',
  QUIZ_NOT_FOUND: 'This quiz is not on this device. Scan the quiz QR first.',
  AMBIGUOUS_QUIZ: 'Two different quizzes share this ID. Ask the teacher to publish it again.',
  ANSWER_KEY_MISSING: 'The answer key for this quiz is not on this device. Only the publishing teacher device can grade it.',
  ANSWER_KEY_MISMATCH: 'The stored answer key does not match this quiz.',
  ANSWER_KEY_CONFLICT: 'A different answer key is already stored for this quiz.',
  INVALID_ANSWER: 'Answer every question with one of its options.',
  ALREADY_SUBMITTED: 'Answers for this quiz were already submitted from this device.',
  KEY_STORE_FAILED: 'The private answer-key storage could not complete the operation.',
};

export class DomainError extends Error {
  readonly details: Readonly<DomainErrorDetails>;
  constructor(readonly code: DomainErrorCode, details: DomainErrorDetails = {}, message = domainMessages[code]) {
    super(message);
    this.name = 'DomainError';
    this.details = Object.freeze({ ...details });
  }
}

const syncMessages: Record<ErrorCode, string> = {
  INVALID_EVENT: 'A record is invalid and was not saved.',
  INVALID_PAYLOAD: 'This is not a valid CarrySync QR code.',
  PAYLOAD_TOO_LARGE: 'Too much data for one QR code. Select fewer records.',
  UNSUPPORTED_VERSION: 'This QR code was made by an unsupported CarrySync version.',
  WRONG_APPLICATION: 'This QR code belongs to the other app. Open the correct app to import it.',
  CONFLICTING_EVENT: 'A received record conflicts with one already saved. Nothing was imported.',
  QR_GENERATION_FAILED: 'The QR code could not be created. Select fewer records and retry.',
  STORAGE_FAILED: 'Local storage could not complete the operation. Existing data is unchanged.',
};

export interface UserFacingError {
  source: 'domain' | 'sync' | 'camera' | 'unknown';
  code: string;
  message: string;
  details?: Readonly<DomainErrorDetails>;
}

/** Maps SDK, domain and camera errors to safe display text for the UI. */
export function describeError(error: unknown): UserFacingError {
  if (error instanceof DomainError) return { source: 'domain', code: error.code, message: error.message, details: error.details };
  if (error instanceof CarrySyncError) return { source: 'sync', code: error.code, message: syncMessages[error.code] ?? error.message };
  if (error instanceof Error && error.name === 'CameraError' && 'code' in error && typeof error.code === 'string') {
    return { source: 'camera', code: error.code, message: error.message };
  }
  return { source: 'unknown', code: 'UNKNOWN', message: 'Something went wrong. Please retry.' };
}
