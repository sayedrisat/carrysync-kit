import {
  decodeQrPayload, mapStorageError,
  type ApplicationId, type Envelope, type ErrorCode, type ImportResult,
} from '@carrysync/core';

export interface PayloadImporter { importPayload(payload: string): Promise<ImportResult> }
export type TransferState =
  | { state: 'idle' }
  | { state: 'review'; envelope: Envelope }
  | { state: 'importing' }
  | { state: 'imported' | 'duplicate'; result: ImportResult }
  | { state: 'error'; code: ErrorCode; message: string };

/** Camera and manual text share this exact review/confirm path; core owns every protocol/merge rule. */
export class QrImportSession {
  private status: TransferState = { state: 'idle' };
  private pending: string | undefined;
  private operation: Promise<TransferState> | undefined;
  private readonly listeners = new Set<(state: TransferState) => void>();

  constructor(readonly app: ApplicationId, private readonly importer: PayloadImporter) {}

  getState(): TransferState { return structuredClone(this.status); }
  subscribe(listener: (state: TransferState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    for (const listener of this.listeners) {
      try { listener(this.getState()); } catch { /* Consumer UI errors cannot change import correctness. */ }
    }
  }
  clear(): TransferState {
    if (!this.operation) {
      this.pending = undefined;
      this.status = { state: 'idle' };
      this.emit();
    }
    return this.getState();
  }
  reviewText(payload: string): TransferState {
    if (this.operation) return this.getState();
    this.pending = undefined;
    try {
      const envelope = decodeQrPayload(payload, this.app);
      this.pending = payload;
      this.status = { state: 'review', envelope };
    } catch (error) {
      const safe = mapStorageError(error);
      this.status = { state: 'error', code: safe.code, message: safe.message };
    }
    this.emit();
    return this.getState();
  }
  confirmImport(): Promise<TransferState> {
    if (this.operation) return this.operation;
    const payload = this.pending;
    if (payload === undefined) return Promise.resolve(this.getState());
    this.pending = undefined;
    this.status = { state: 'importing' };
    // Assign before notifying subscribers: even a synchronous double-confirm cannot import twice.
    this.operation = Promise.resolve().then(async () => {
      try {
        const result = await this.importer.importPayload(payload);
        this.status = { state: result.added === 0 ? 'duplicate' : 'imported', result };
      } catch (error) {
        const safe = mapStorageError(error);
        this.status = { state: 'error', code: safe.code, message: safe.message };
      }
      this.operation = undefined;
      this.emit();
      return this.getState();
    });
    this.emit();
    return this.operation;
  }
}
