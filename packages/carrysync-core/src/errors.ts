export type ErrorCode =
  | 'INVALID_EVENT' | 'INVALID_PAYLOAD' | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_VERSION' | 'WRONG_APPLICATION' | 'CONFLICTING_EVENT'
  | 'QR_GENERATION_FAILED' | 'STORAGE_FAILED';

export class CarrySyncError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'CarrySyncError';
  }
}

export function toCarrySyncError(error: unknown): CarrySyncError {
  return error instanceof CarrySyncError
    ? error
    : new CarrySyncError('STORAGE_FAILED', 'The local event store could not complete the operation.');
}
