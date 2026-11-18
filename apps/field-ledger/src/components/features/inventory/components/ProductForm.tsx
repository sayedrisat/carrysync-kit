
import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PackagePlus,
} from "lucide-react";

import type { useInventory } from "../../../../hooks/useInventory";

type Product = ReturnType<typeof useInventory>["products"][number];

export interface MovementDraft {
  productId: string;
  direction: "in" | "out";
  quantity: number;
}

interface Props {
  products: Product[];
  initialProductId?: string | undefined;
  onSubmit: (draft: MovementDraft) => Promise<void>;
  onCancel: () => void;
}

const NEW_PRODUCT = "__new_product__";

export default function ProductForm({
  products,
  initialProductId,
  onSubmit,
  onCancel,
}: Props) {
  const [direction, setDirection] = useState<"in" | "out">("in");

  const [selectedProductOverride, setSelectedProductOverride] =
    useState<string | null>(null);

  const selectedProduct =
    selectedProductOverride ??
    initialProductId ??
    products[0]?.productKey ??
    NEW_PRODUCT;

  const [newProductName, setNewProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isNewProduct = selectedProduct === NEW_PRODUCT;

  const handleDirectionChange = (nextDirection: "in" | "out") => {
    setDirection(nextDirection);
    setError("");

    if (nextDirection === "out" && isNewProduct) {
      setSelectedProductOverride(products[0]?.productKey ?? "");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const productId = isNewProduct
      ? newProductName.trim()
      : products.find(
          (item) => item.productKey === selectedProduct
        )?.label ?? "";

    const amount = Number(quantity);

    if (!productId) {
      setError("Please select or enter a product name.");
      return;
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 1_000_000
    ) {
      setError(
        "Enter a whole-number quantity between 1 and 1,000,000."
      );
      return;
    }

    if (direction === "out") {
      const product = products.find(
        (item) => item.productKey === selectedProduct
      );

      if (!product || product.balance < amount) {
        setError(
          `Insufficient stock. Available: ${product?.balance ?? 0}.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      await onSubmit({
        productId,
        direction,
        quantity: amount,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save movement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Movement type */}
      <div>
        <label className="mb-2 block text-xs font-bold text-[var(--text)]">
          Movement type
        </label>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--background)] p-1">
          <button
            type="button"
            onClick={() => handleDirectionChange("in")}
            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold transition ${
              direction === "in"
                ? "bg-[var(--surface)] text-emerald-600 shadow-sm dark:text-emerald-400"
                : "text-[var(--muted)]"
            }`}
          >
            <ArrowDownLeft size={16} />
            Stock IN
          </button>

          <button
            type="button"
            onClick={() => handleDirectionChange("out")}
            disabled={products.length === 0}
            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold transition disabled:opacity-40 ${
              direction === "out"
                ? "bg-[var(--surface)] text-red-500 shadow-sm"
                : "text-[var(--muted)]"
            }`}
          >
            <ArrowUpRight size={16} />
            Stock OUT
          </button>
        </div>
      </div>

      {/* Product selection */}
      <div>
        <label
          htmlFor="inventory-product"
          className="mb-2 block text-xs font-bold text-[var(--text)]"
        >
          Select product
        </label>

        <select
          id="inventory-product"
          value={selectedProduct}
          onChange={(event) =>
            setSelectedProductOverride(event.target.value)
          }
          required
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
        >
          {products.map((product) => (
            <option
              key={product.productKey}
              value={product.productKey}
            >
              {product.label} · {product.balance} available
            </option>
          ))}

          {direction === "in" && (
            <option value={NEW_PRODUCT}>
              + Add a new product
            </option>
          )}
        </select>
      </div>

      {/* New product name */}
      {isNewProduct && direction === "in" && (
        <div>
          <label
            htmlFor="new-product-name"
            className="mb-2 block text-xs font-bold text-[var(--text)]"
          >
            New product name
          </label>

          <input
            id="new-product-name"
            value={newProductName}
            onChange={(event) =>
              setNewProductName(event.target.value)
            }
            placeholder="e.g. Wireless Mouse"
            maxLength={80}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
          />
        </div>
      )}

      {/* Quantity */}
      <div>
        <label
          htmlFor="movement-quantity"
          className="mb-2 block text-xs font-bold text-[var(--text)]"
        >
          Quantity
        </label>

        <input
          id="movement-quantity"
          type="number"
          min="1"
          max="1000000"
          step="1"
          value={quantity}
          onChange={(event) =>
            setQuantity(event.target.value)
          }
          placeholder="Enter quantity"
          required
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
        />
      </div>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--hover)] disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            submitting ||
            (direction === "out" && products.length === 0)
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 dark:text-[#071c20]"
        >
          <PackagePlus size={15} />
          {submitting
            ? "Saving..."
            : `Confirm stock ${direction.toUpperCase()}`}
        </button>
      </div>
    </form>
  );
}
