
import { ArrowRight, Package } from "lucide-react";
import type { useInventory } from "../../../../hooks/useInventory";

type Product = ReturnType<typeof useInventory>["products"][number];

interface Props {
  products: Product[];
  onViewAll: () => void;
}

export default function InventorySummary({ products, onViewAll }: Props) {
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--text)]">Inventory summary</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Your current product stock levels
          </p>
        </div>

        <button
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--primary)] transition hover:gap-2"
        >
          View all <ArrowRight size={14} />
        </button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <Package size={28} className="mb-3 text-[var(--muted)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            No products yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Add stock to get started.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[390px] text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--table-head)]">
                <th className="rounded-l-lg px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Product
                </th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Quantity
                </th>
                <th className="rounded-r-lg px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {products.slice(0, 5).map((product) => (
                <tr
                  key={product.productKey}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]"
                >
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--soft-surface)] text-sm font-bold text-[var(--primary)]">
                        {product.label.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-[var(--text)]">
                        {product.label}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-4 text-xs font-bold text-[var(--text)]">
                    {product.balance.toLocaleString()}
                  </td>

                  <td className="px-3 py-4">
                    <StatusBadge status={product.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: Product["status"] }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    low: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    out: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    negative: "bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-200",
  };

  const labels = {
    ok: "In stock",
    low: "Low stock",
    out: "Out of stock",
    negative: "Negative",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
