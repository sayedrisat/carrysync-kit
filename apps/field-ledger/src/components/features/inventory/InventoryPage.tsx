
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
  Package,
  SlidersHorizontal,
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
      <section className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--soft-surface)] via-[var(--surface)] to-[var(--background)] p-4 shadow-sm transition-colors duration-500 sm:rounded-3xl sm:p-6 lg:p-7">
  <div className="relative z-10 flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="min-w-0 flex-1">
      <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-[var(--background)] sm:h-9 sm:w-9 sm:rounded-xl">
          <Package size={17} />
        </div>

        <span className="text-[9px] font-extrabold tracking-[1.5px] text-[var(--muted)] sm:text-[10px] sm:tracking-[1.8px]">
          PRODUCT MANAGEMENT
        </span>
      </div>

      <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)] min-[400px]:text-2xl sm:text-3xl">
        All products
      </h2>

      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-sm">
        Manage your inventory, monitor stock levels and keep every product
        movement organized.
      </p>

      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 sm:mt-4 sm:px-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)] sm:h-2 sm:w-2" />
        <span className="truncate text-[10px] font-bold text-[var(--text)] sm:text-xs">
          {products.length} products in inventory
        </span>
      </div>
    </div>

    <button
      type="button"
      onClick={() => openForm()}
      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-[var(--background)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:scale-95 sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
    >
      <Plus size={16} />
      Add stock
    </button>
  </div>

  <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl sm:h-48 sm:w-48" />
  <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl sm:right-32 sm:h-40 sm:w-40" />
</section>

      {/* Stock warnings */}
      {warnings.length > 0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/20">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertTriangle size={18} />
          </div>

          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
              {warnings.length} product
              {warnings.length !== 1 ? "s" : ""} need attention
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-400">
              Review low, out-of-stock or negative-stock products to keep
              your inventory accurate.
            </p>
          </div>
        </section>
      )}

      {/* Product list card */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {/* Card heading */}
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="text-base font-extrabold text-[var(--text)]">
              Inventory overview
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Search and manage your available products.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="rounded-lg bg-[var(--soft-surface)] px-3 py-2 text-[11px] font-bold text-[var(--text)]">
              {filteredProducts.length} results
            </span>
          </div>
        </div>

        {/* Search and view controls */}
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-4 text-xs text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
              <SlidersHorizontal size={14} />
              View
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1">
              <button
                type="button"
                onClick={() => setView("table")}
                aria-label="Table view"
                aria-pressed={view === "table"}
                className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                  view === "table"
                    ? "bg-[var(--primary)] text-[var(--background)] shadow-sm"
                    : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
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
                    ? "bg-[var(--primary)] text-[var(--background)] shadow-sm"
                    : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                }`}
              >
                <LayoutGrid size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Product content */}
        <div className="p-4 sm:p-5">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] px-5 py-14 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--soft-surface)] text-[var(--primary)]">
                <Package size={25} />
              </div>

              <p className="text-sm font-bold text-[var(--text)]">
                {search ? "No matching products" : "No products yet"}
              </p>

              <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--muted)]">
                {search
                  ? "Try searching with another product name."
                  : "Add stock to create your first product and start managing your inventory."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={() => openForm()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-[var(--background)] transition hover:opacity-90"
                >
                  <Plus size={15} />
                  Add your first product
                </button>
              )}
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
        </div>
      </section>

      {/* Movement form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
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
            className="my-auto w-full max-w-[460px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--soft-surface)] px-3 py-1.5">
                  <Package size={13} className="text-[var(--primary)]" />
                  <span className="text-[10px] font-extrabold tracking-wider text-[var(--text)]">
                    INVENTORY ACTION
                  </span>
                </div>

                <h2
                  id="inventory-form-title"
                  className="text-xl font-extrabold tracking-tight"
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
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]"
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
