import { initialProducts } from "../mocks/inventoryData";
import type {
  Product,
  StockMovement,
  InventorySnapshot,
  MovementType,
} from "../types/inventory";

const PRODUCTS_KEY = "fieldledger_products";
const MOVEMENTS_KEY = "fieldledger_movements";

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
};

const getProducts = (): Product[] =>
  readStorage(PRODUCTS_KEY, initialProducts);

const getMovements = (): StockMovement[] =>
  readStorage<StockMovement[]>(MOVEMENTS_KEY, []);

const save = (products: Product[], movements: StockMovement[]) => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));

  window.dispatchEvent(new Event("fieldledger:change"));
};

export const inventoryService = {
  async getInventory(): Promise<InventorySnapshot> {
    const products = getProducts();

    return {
      products,
      warnings: products.filter(
        (product) =>
          product.quantity <= product.lowStockThreshold
      ),
    };
  },

  async getHistory(): Promise<StockMovement[]> {
    return getMovements().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  },

  async recordMovement(input: {
    productId: string;
    type: MovementType;
    quantity: number;
    note: string;
  }): Promise<void> {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }

    const products = getProducts();
    const movements = getMovements();

    const product = products.find(
      (item) => item.id === input.productId
    );

    if (!product) {
      throw new Error("Product not found.");
    }

    const delta =
      input.type === "IN" ? input.quantity : -input.quantity;

    if (product.quantity + delta < 0) {
      throw new Error("Not enough stock available.");
    }

    const updatedProduct: Product = {
      ...product,
      quantity: product.quantity + delta,
      updatedAt: new Date().toISOString(),
    };

    const updatedProducts = products.map((item) =>
      item.id === product.id ? updatedProduct : item
    );

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.productName,
      type: input.type,
      quantity: input.quantity,
      quantityDelta: delta,
      note: input.note,
      createdAt: new Date().toISOString(),
    };

    save(updatedProducts, [movement, ...movements]);
  },
};
