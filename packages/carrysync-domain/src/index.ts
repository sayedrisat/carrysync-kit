// @carrysync/domain — generic transfer helpers and structured errors shared by both applications.
// App logic: '@carrysync/domain/field-ledger', '@carrysync/domain/quiz-relay'.
// Browser persistence/bootstrap: '@carrysync/domain/indexeddb' (the only entry that loads Dexie).
export { DomainError, describeError } from './errors.js';
export type { DomainErrorCode, DomainErrorDetails, UserFacingError } from './errors.js';
export { measureExport, planExportBatches, renderExportPlan } from './export-plan.js';
export type { ExportOptions, ExportMeasurement, ExportBatch, ExportPlan, QrBatch } from './export-plan.js';
export { previewImport } from './preview.js';
export type { ImportPreview } from './preview.js';
export { compareChronological, sortChronologically } from './shared.js';
export type { Unsubscribe } from './shared.js';
