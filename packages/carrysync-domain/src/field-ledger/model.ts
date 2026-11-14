import { mergeEvents, type AppEvent, type EventInput, type SyncEvent } from '@carrysync/core';
import { DomainError } from '../errors.js';
import { compareChronological, compareText, eventsOfType } from '../shared.js';

export const MAX_QUANTITY = 1_000_000;
export const MAX_PRODUCT_ID_LENGTH = 80;
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type MovementDirection = 'in' | 'out';
export interface MovementDraft {
  productId: string;
  direction: MovementDirection;
  /** Positive whole number of units; direction supplies the sign. */
  quantity: number;
}
export interface KnownProduct { productKey: string; label: string }

type StockEvent = AppEvent<'field-ledger'>;

/** Display form: Unicode NFKC, trimmed, internal whitespace collapsed. Case is preserved. */
export function cleanProductLabel(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

/** Grouping key: cleaned label, case-folded. Stored/imported events are never rewritten. */
export function normalizeProductKey(raw: string): string {
  return cleanProductLabel(raw).toLowerCase();
}

/** Validates a form draft and returns the `stock.moved` input for `client.createEvent`. */
export function buildStockMovement(draft: MovementDraft, known: readonly KnownProduct[] = []): EventInput<'field-ledger'> {
  if (draft === null || typeof draft !== 'object') throw new DomainError('INVALID_INPUT', { field: 'movement' });
  if (typeof draft.productId !== 'string') throw new DomainError('INVALID_INPUT', { field: 'productId' });
  const cleaned = cleanProductLabel(draft.productId);
  if (cleaned.length === 0 || cleaned.length > MAX_PRODUCT_ID_LENGTH) {
    throw new DomainError('INVALID_INPUT', { field: 'productId', limit: MAX_PRODUCT_ID_LENGTH });
  }
  if (draft.direction !== 'in' && draft.direction !== 'out') throw new DomainError('INVALID_INPUT', { field: 'direction' });
  const { quantity } = draft;
  if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new DomainError('INVALID_INPUT', { field: 'quantity', limit: MAX_QUANTITY });
  }
  const key = normalizeProductKey(cleaned);
  // Reuse the established spelling so new local events converge on one label.
  const label = known.find((product) => product.productKey === key)?.label ?? cleaned;
  return { type: 'stock.moved', data: { productId: label, quantityDelta: draft.direction === 'in' ? quantity : -quantity } };
}

export type StockStatus = 'ok' | 'low' | 'out' | 'negative';

export interface ProductBalance {
  productKey: string;
  /** Spelling from the product's earliest movement. */
  label: string;
  /** Every distinct recorded spelling, sorted. */
  labels: string[];
  balance: number;
  totalIn: number;
  totalOut: number;
  movementCount: number;
  firstMovementAt: string;
  lastMovementAt: string;
  threshold: number;
  status: StockStatus;
}

export type InventoryWarningCode = 'NEGATIVE_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
export interface InventoryWarning {
  code: InventoryWarningCode;
  productKey: string;
  label: string;
  balance: number;
  threshold: number;
}

export interface InventoryOptions {
  /** Balance at or below which a product is "low" (default 5). */
  lowStockThreshold?: number;
  /** Per-product thresholds, keyed by product ID or label (normalized internally). */
  thresholds?: Readonly<Record<string, number>>;
}

export interface InventorySnapshot {
  products: ProductBalance[];
  warnings: InventoryWarning[];
  totals: { productCount: number; movementCount: number; unitsOnHand: number };
}

function checkThreshold(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > MAX_QUANTITY) {
    throw new DomainError('INVALID_INPUT', { field });
  }
  return value;
}

/** Unique, validated stock events (quiz events are ignored). Duplicates by ID count once. */
function stockEvents(events: readonly SyncEvent[]): StockEvent[] {
  return mergeEvents('field-ledger', [], eventsOfType(events, 'stock.moved')).events as StockEvent[];
}

function statusOf(balance: number, threshold: number): StockStatus {
  if (balance < 0) return 'negative';
  if (balance === 0) return 'out';
  return balance <= threshold ? 'low' : 'ok';
}

const warningRank: Record<InventoryWarningCode, number> = { NEGATIVE_STOCK: 0, OUT_OF_STOCK: 1, LOW_STOCK: 2 };

/** Deterministic balances from the accepted event set; independent of event order and re-imports. */
export function projectInventory(events: readonly SyncEvent[], options: InventoryOptions = {}): InventorySnapshot {
  const defaultThreshold = checkThreshold(options.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD, 'lowStockThreshold');
  const thresholds = new Map<string, number>();
  for (const [product, value] of Object.entries(options.thresholds ?? {})) {
    thresholds.set(normalizeProductKey(product), checkThreshold(value, `thresholds.${product}`));
  }
  const ordered = stockEvents(events).sort(compareChronological);
  const byKey = new Map<string, { label: string; labels: Set<string>; balance: number; totalIn: number; totalOut: number; count: number; first: string; last: string }>();
  for (const event of ordered) {
    const key = normalizeProductKey(event.data.productId);
    const delta = event.data.quantityDelta;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { label: cleanProductLabel(event.data.productId), labels: new Set(), balance: 0, totalIn: 0, totalOut: 0, count: 0, first: event.createdAt, last: event.createdAt };
      byKey.set(key, entry);
    }
    entry.labels.add(cleanProductLabel(event.data.productId));
    entry.balance += delta;
    if (delta > 0) entry.totalIn += delta; else entry.totalOut -= delta;
    entry.count += 1;
    entry.last = event.createdAt;
  }
  const products: ProductBalance[] = [...byKey.entries()]
    .sort(([a], [b]) => compareText(a, b))
    .map(([productKey, entry]) => {
      const threshold = thresholds.get(productKey) ?? defaultThreshold;
      return {
        productKey, label: entry.label, labels: [...entry.labels].sort(compareText),
        balance: entry.balance, totalIn: entry.totalIn, totalOut: entry.totalOut, movementCount: entry.count,
        firstMovementAt: entry.first, lastMovementAt: entry.last, threshold, status: statusOf(entry.balance, threshold),
      };
    });
  const warnings: InventoryWarning[] = products
    .filter((product) => product.status !== 'ok')
    .map((product) => ({
      code: product.status === 'negative' ? 'NEGATIVE_STOCK' as const : product.status === 'out' ? 'OUT_OF_STOCK' as const : 'LOW_STOCK' as const,
      productKey: product.productKey, label: product.label, balance: product.balance, threshold: product.threshold,
    }))
    .sort((a, b) => warningRank[a.code] - warningRank[b.code] || compareText(a.productKey, b.productKey));
  return {
    products, warnings,
    totals: {
      productCount: products.length,
      movementCount: ordered.length,
      unitsOnHand: products.reduce((sum, product) => sum + Math.max(0, product.balance), 0),
    },
  };
}

export interface StockMovement {
  eventId: string;
  productKey: string;
  /** Canonical product label (earliest spelling). */
  productLabel: string;
  /** Exact label recorded in this event. */
  recordedLabel: string;
  direction: MovementDirection;
  quantity: number;
  delta: number;
  /** Product balance immediately after this movement, in chronological order. */
  balanceAfter: number;
  createdAt: string;
  deviceId: string;
  origin: 'local' | 'imported' | 'unknown';
}

export interface HistoryQuery {
  /** Filter by product ID or any spelling of it. */
  productId?: string;
  /** Marks events created by this device as `local`. */
  localDeviceId?: string;
  order?: 'newest' | 'oldest';
  limit?: number;
}

/** Stock history with running balances. Default order: newest first. */
export function listMovements(events: readonly SyncEvent[], query: HistoryQuery = {}): StockMovement[] {
  if (query.limit !== undefined && (!Number.isSafeInteger(query.limit) || query.limit < 0)) {
    throw new DomainError('INVALID_INPUT', { field: 'limit' });
  }
  const filterKey = query.productId === undefined ? undefined : normalizeProductKey(query.productId);
  const balances = new Map<string, number>();
  const labels = new Map<string, string>();
  const movements: StockMovement[] = [];
  for (const event of stockEvents(events).sort(compareChronological)) {
    const productKey = normalizeProductKey(event.data.productId);
    const recordedLabel = cleanProductLabel(event.data.productId);
    if (!labels.has(productKey)) labels.set(productKey, recordedLabel);
    const balanceAfter = (balances.get(productKey) ?? 0) + event.data.quantityDelta;
    balances.set(productKey, balanceAfter);
    if (filterKey !== undefined && filterKey !== productKey) continue;
    movements.push({
      eventId: event.id, productKey, productLabel: labels.get(productKey) ?? recordedLabel, recordedLabel,
      direction: event.data.quantityDelta > 0 ? 'in' : 'out', quantity: Math.abs(event.data.quantityDelta),
      delta: event.data.quantityDelta, balanceAfter, createdAt: event.createdAt, deviceId: event.deviceId,
      origin: query.localDeviceId === undefined ? 'unknown' : event.deviceId === query.localDeviceId ? 'local' : 'imported',
    });
  }
  if ((query.order ?? 'newest') === 'newest') movements.reverse();
  return query.limit === undefined ? movements : movements.slice(0, query.limit);
}

export interface MovementCheck {
  productKey: string;
  balanceBefore: number;
  balanceAfter: number;
  warning?: InventoryWarningCode;
}

/** Predicts the effect of a validated movement input on a snapshot. */
export function checkMovement(snapshot: InventorySnapshot, input: EventInput<'field-ledger'>, options: InventoryOptions = {}): MovementCheck {
  const productKey = normalizeProductKey(input.data.productId);
  const product = snapshot.products.find((item) => item.productKey === productKey);
  const balanceBefore = product?.balance ?? 0;
  const balanceAfter = balanceBefore + input.data.quantityDelta;
  const threshold = product?.threshold ?? checkThreshold(options.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD, 'lowStockThreshold');
  const status = statusOf(balanceAfter, threshold);
  const result: MovementCheck = { productKey, balanceBefore, balanceAfter };
  if (status !== 'ok') result.warning = status === 'negative' ? 'NEGATIVE_STOCK' : status === 'out' ? 'OUT_OF_STOCK' : 'LOW_STOCK';
  return result;
}
