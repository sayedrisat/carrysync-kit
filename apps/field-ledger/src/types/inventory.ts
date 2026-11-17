
export type MovementType = "IN" | "OUT";

export interface Product {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  quantityDelta: number;
  note: string;
  createdAt: string;
}

export interface InventorySnapshot {
  products: Product[];
  warnings: Product[];
}
