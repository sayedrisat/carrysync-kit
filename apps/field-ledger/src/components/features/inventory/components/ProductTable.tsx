
import { Package, ArrowUpDown } from "lucide-react";
import type { useInventory } from "../../../../hooks/useInventory";

type Product = ReturnType<typeof useInventory>["products"][number];

interface Props {
  products: Product[];
  onSelect?: (product: Product) => void;
}

export default function ProductTable({ products, onSelect }: Props) {
  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <Package size={32} className="mb-3 text-[var(--muted)]" />
        <p className="text-sm font-bold text-[var(--text)]">No products yet</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Add your first product using the Add stock button.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[650px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--table-head)]">
            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Product
            </th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Stock balance
            </th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Total IN
            </th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Total OUT
            </th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Status
            </th>
            {onSelect && (
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Action
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr
              key={product.productKey}
              className="border-b border-[var(--border)] last:border-0 transition hover:bg-[var(--hover)]"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--soft-surface)] text-sm font-bold text-[var(--primary)]">
                    {product.label.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text)]">
                      {product.label}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      {product.movementCount} movements
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-4 text-sm font-extrabold tabular-nums text-[var(--text)]">
                {product.balance.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                +{product.totalIn.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-xs font-semibold text-red-500">
                −{product.totalOut.toLocaleString()}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={product.status} />
              </td>

              {onSelect && (
                <td className="px-4 py-4">
                  <button
                    onClick={() => onSelect(product)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[10px] font-bold text-[var(--text)] transition hover:bg-[var(--soft-surface)]"
                  >
                    <ArrowUpDown size={13} />
                    Movement
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    negative: "Negative stock",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
