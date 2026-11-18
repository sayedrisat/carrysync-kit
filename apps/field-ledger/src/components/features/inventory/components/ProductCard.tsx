
import { ArrowDownLeft, ArrowUpRight, Package } from "lucide-react";
import type { useInventory } from "../../../../hooks/useInventory";

type Product = ReturnType<typeof useInventory>["products"][number];

interface Props {
  product: Product;
  onSelect?: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: Props) {
  const statusStyles = {
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    low: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    out: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    negative: "bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-200",
  };

  const statusLabels = {
    ok: "In stock",
    low: "Low stock",
    out: "Out of stock",
    negative: "Negative stock",
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
          <Package size={21} />
        </div>

        <span className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${statusStyles[product.status]}`}>
          {statusLabels[product.status]}
        </span>
      </div>

      <h3 className="mt-4 truncate text-sm font-bold text-[var(--text)]">
        {product.label}
      </h3>

      <p className="mt-1 text-[10px] text-[var(--muted)]">
        {product.movementCount} recorded movements
      </p>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold text-[var(--muted)]">
            Available stock
          </p>
          <strong className="mt-1 block text-3xl font-extrabold tabular-nums text-[var(--text)]">
            {product.balance.toLocaleString()}
          </strong>
        </div>

        <div className="space-y-1 text-right">
          <p className="flex items-center justify-end gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft size={12} /> {product.totalIn}
          </p>
          <p className="flex items-center justify-end gap-1 text-[10px] font-semibold text-red-500">
            <ArrowUpRight size={12} /> {product.totalOut}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-3">
        <div className="flex justify-between text-[10px] text-[var(--muted)]">
          <span>Low-stock threshold</span>
          <strong className="text-[var(--text)]">{product.threshold}</strong>
        </div>
      </div>

      {onSelect && (
        <button
          onClick={() => onSelect(product)}
          className="mt-4 w-full rounded-xl border border-[var(--border)] py-2.5 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--soft-surface)]"
        >
          Record movement
        </button>
      )}
    </article>
  );
}
