export {
  MAX_QUANTITY, MAX_PRODUCT_ID_LENGTH, DEFAULT_LOW_STOCK_THRESHOLD,
  cleanProductLabel, normalizeProductKey, buildStockMovement, projectInventory, listMovements, checkMovement,
} from './model.js';
export type {
  MovementDirection, MovementDraft, KnownProduct, StockStatus, ProductBalance, InventoryWarningCode,
  InventoryWarning, InventoryOptions, InventorySnapshot, StockMovement, HistoryQuery, MovementCheck,
} from './model.js';
export { createFieldLedgerService } from './service.js';
export type {
  FieldLedgerClient, FieldLedgerServiceOptions, RecordMovementOptions, RecordedMovement,
  InventoryImpact, FieldLedgerImportPreview, FieldLedgerService,
} from './service.js';
