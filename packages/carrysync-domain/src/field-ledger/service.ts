import type { CarrySyncClient, ImportResult, SyncEvent } from '@carrysync/core';
import { DomainError } from '../errors.js';
import { planExportBatches, renderExportPlan, type ExportOptions, type ExportPlan, type QrBatch } from '../export-plan.js';
import { previewImport, type ImportPreview } from '../preview.js';
import { createChangeEmitter, type Unsubscribe } from '../shared.js';
import {
  buildStockMovement, checkMovement, listMovements, normalizeProductKey, projectInventory,
  type HistoryQuery, type InventoryOptions, type InventorySnapshot, type InventoryWarningCode,
  type MovementDraft, type ProductBalance, type StockMovement,
} from './model.js';

export type FieldLedgerClient = Pick<CarrySyncClient<'field-ledger'>, 'createEvent' | 'listEvents' | 'prepareExport' | 'importPayload'>;

export interface FieldLedgerServiceOptions {
  client: FieldLedgerClient;
  deviceId: string;
  inventory?: InventoryOptions;
}

export interface RecordMovementOptions {
  /** Allow an outgoing movement larger than the current local balance (default false). */
  allowNegative?: boolean;
}

export interface RecordedMovement {
  event: SyncEvent;
  movement: StockMovement;
  product: ProductBalance;
  warning?: InventoryWarningCode;
}

export interface InventoryImpact {
  productKey: string;
  label: string;
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  warning?: InventoryWarningCode;
}

export interface FieldLedgerImportPreview extends ImportPreview {
  /** Effect of the new (non-duplicate) movements on local balances. */
  impact: InventoryImpact[];
}

export function createFieldLedgerService({ client, deviceId, inventory = {} }: FieldLedgerServiceOptions) {
  const changes = createChangeEmitter();
  const events = () => client.listEvents();

  async function selectEvents(eventIds: readonly string[]): Promise<SyncEvent[]> {
    if (eventIds.length === 0) throw new DomainError('EMPTY_SELECTION');
    const byId = new Map((await events()).map((event) => [event.id, event]));
    return eventIds.map((eventId) => {
      const event = byId.get(eventId);
      if (!event) throw new DomainError('INVALID_INPUT', { field: 'eventIds', eventId });
      return event;
    });
  }

  const service = {
    app: 'field-ledger' as const,
    deviceId,

    /** Validates the form draft, applies the stock policy and atomically stores one movement. */
    async recordMovement(draft: MovementDraft, options: RecordMovementOptions = {}): Promise<RecordedMovement> {
      const before = projectInventory(await events(), inventory);
      const input = buildStockMovement(draft, before.products);
      const check = checkMovement(before, input, inventory);
      if (check.balanceAfter < 0 && input.data.quantityDelta < 0 && options.allowNegative !== true) {
        throw new DomainError('INSUFFICIENT_STOCK', { productKey: check.productKey, available: check.balanceBefore });
      }
      const event = await client.createEvent(input);
      changes.emit();
      const after = await events();
      const product = projectInventory(after, inventory).products.find((item) => item.productKey === check.productKey);
      const movement = listMovements(after, { localDeviceId: deviceId }).find((item) => item.eventId === event.id);
      if (!product || !movement) throw new DomainError('INVALID_INPUT', { eventId: event.id });
      const result: RecordedMovement = { event, movement, product };
      if (check.warning) result.warning = check.warning;
      return result;
    },

    async getInventory(options: InventoryOptions = inventory): Promise<InventorySnapshot> {
      return projectInventory(await events(), options);
    },

    async getProduct(productId: string): Promise<ProductBalance | undefined> {
      const key = normalizeProductKey(productId);
      return (await service.getInventory()).products.find((product) => product.productKey === key);
    },

    async getHistory(query: Omit<HistoryQuery, 'localDeviceId'> = {}): Promise<StockMovement[]> {
      return listMovements(await events(), { ...query, localDeviceId: deviceId });
    },

    /** Plans QR batches for the selected movement event IDs without rendering. */
    async planExport(eventIds: readonly string[], options: ExportOptions = {}): Promise<ExportPlan> {
      return planExportBatches('field-ledger', await selectEvents(eventIds), options);
    },

    /** Renders one QR per batch. Show them in order; each scan imports independently and atomically. */
    async prepareExport(eventIds: readonly string[], options: ExportOptions = {}): Promise<QrBatch[]> {
      return renderExportPlan(client, await service.planExport(eventIds, options));
    },

    /** Read-only preview of scanned text, including inventory impact. Never writes. */
    async previewImport(text: string): Promise<FieldLedgerImportPreview> {
      const current = await events();
      const preview = previewImport('field-ledger', current, text);
      const before = projectInventory(current, inventory);
      const after = projectInventory([...current, ...preview.newEvents], inventory);
      const touched = new Set(preview.newEvents.map((event) => event.type === 'stock.moved' ? normalizeProductKey(event.data.productId) : ''));
const impact: InventoryImpact[] = after.products
  .filter((product) => touched.has(product.productKey))
  .map((product) => {
    const existingProduct = before.products.find(
      (item) => item.productKey === product.productKey
    );

    const balanceBefore = existingProduct?.balance ?? 0;

    const item: InventoryImpact = {
      productKey: product.productKey,
      label: existingProduct?.label ?? product.label,
      delta: product.balance - balanceBefore,
      balanceBefore,
      balanceAfter: product.balance,
    };

    if (product.status === 'negative') item.warning = 'NEGATIVE_STOCK';
    else if (product.status === 'out') item.warning = 'OUT_OF_STOCK';
    else if (product.status === 'low') item.warning = 'LOW_STOCK';

    return item;
  });
      return { ...preview, impact };
    },

    /** Authoritative import (full revalidation inside the store transaction). Usable as a CameraScanner importer. */
    async importPayload(text: string): Promise<ImportResult> {
      const result = await client.importPayload(text);
      if (result.added > 0) changes.emit();
      return result;
    },

    /** Called after local writes or imports that added events. Returns an unsubscribe function. */
    onChange(listener: () => void): Unsubscribe {
      return changes.subscribe(listener);
    },
  };
  return service;
}

export type FieldLedgerService = ReturnType<typeof createFieldLedgerService>;
