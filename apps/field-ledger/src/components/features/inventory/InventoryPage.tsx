
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";

import type { useInventory } from "../../../hooks/useInventory";
import ProductCard from "./components/ProductCard";
import ProductTable from "./components/ProductTable";
import ProductForm, {
  type MovementDraft,
} from "./components/ProductForm";

type InventoryData = ReturnType<typeof useInventory>;

interface Props {
  products: InventoryData["products"];
  warnings: InventoryData["warnings"];
  onRecordMovement: (draft: MovementDraft) => Promise<void>;
}

export default function InventoryPage({
  products,
  warnings,
  onRecordMovement,
}: Props) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [showForm, setShowForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<
    string | undefined
  >();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      product.label.toLowerCase().includes(query)
    );
  }, [products, search]);

  const openForm = (productId?: string) => {
    setSelectedProductId(productId);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedProductId(undefined);
  };

  const handleSubmit = async (draft: MovementDraft) => {
    await onRecordMovement(draft);
    closeForm();
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-bold tracking-[1.5px] text-[var(--muted)]">
            PRODUCT MANAGEMENT
          </span>

          <h2 className="mt-2 text-2xl font-extrabold text-[var(--text)]">
            All products
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            {products.length} products in your inventory
          </p>
        </div>

        <button
          type="button"
          onClick={() => openForm()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 dark:text-[#071c20]"
        >
          <Plus size={16} />
          Add stock
        </button>
      </section>

      {/* Stock warnings */}
      {warnings.length > 0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />

          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {warnings.length} product
              {warnings.length !== 1 ? "s" : ""} need attention
            </p>

            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Review low, out-of-stock or negative-stock products.
            </p>
          </div>
        </section>
      )}

      {/* Product list */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-4 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 self-end rounded-xl bg-[var(--background)] p-1">
            <button
              type="button"
              onClick={() => setView("table")}
              aria-label="Table view"
              aria-pressed={view === "table"}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                view === "table"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              <List size={17} />
            </button>

            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                view === "grid"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>

        {/* Empty state */}
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-[var(--text)]">
              {search ? "No matching products" : "No products yet"}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              {search
                ? "Try searching with another product name."
                : "Add stock to create your first product."}
            </p>
          </div>
        ) : view === "table" ? (
          <ProductTable
            products={filteredProducts}
            onSelect={(product) => openForm(product.productKey)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[540px]:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.productKey}
                product={product}
                onSelect={(item) => openForm(item.productKey)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Movement form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-form-title"
            className="my-auto w-full max-w-[460px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold tracking-[1.4px] text-[var(--muted)]">
                  INVENTORY ACTION
                </span>

                <h2
                  id="inventory-form-title"
                  className="mt-2 text-xl font-extrabold"
                >
                  Record stock movement
                </h2>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  Update your product stock balance.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--hover)] text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                <X size={18} />
              </button>
            </div>

            <ProductForm
              products={products}
              initialProductId={selectedProductId}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </section>
        </div>
      )}
    </div>
  );
}
