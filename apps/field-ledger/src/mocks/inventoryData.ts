
import type { Product } from "../types/inventory";

export const initialProducts: Product[] = [
  {
    id: "p1",
    productName: "Laptop Charger",
    sku: "ACC-001",
    quantity: 45,
    unit: "pcs",
    lowStockThreshold: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p2",
    productName: "USB Cable",
    sku: "ACC-002",
    quantity: 8,
    unit: "pcs",
    lowStockThreshold: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p3",
    productName: "Wireless Mouse",
    sku: "ACC-003",
    quantity: 30,
    unit: "pcs",
    lowStockThreshold: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p4",
    productName: "Keyboard",
    sku: "ACC-004",
    quantity: 0,
    unit: "pcs",
    lowStockThreshold: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p5",
    productName: "HDMI Cable",
    sku: "ACC-005",
    quantity: 18,
    unit: "pcs",
    lowStockThreshold: 5,
    updatedAt: new Date().toISOString(),
  },
];

export const initialMovements = [];
