
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { useInventory } from "../../../../hooks/useInventory";

type Warning = ReturnType<typeof useInventory>["warnings"][number];

interface Props {
  warnings: Warning[];
  onViewInventory: () => void;
}

export default function LowStockAlerts({
  warnings,
  onViewInventory,
}: Props) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--text)]">Stock alerts</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Products that need your attention
          </p>
        </div>

        <span className="rounded-full bg-[var(--soft-surface)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
          {warnings.length}
        </span>
      </div>

      {warnings.length === 0 ? (
        <div className="flex flex-col items-center py-7 text-center">
          <CheckCircle2 size={28} className="mb-2 text-emerald-500" />
          <p className="text-sm font-semibold text-[var(--text)]">
            Everything looks good!
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            No stock alerts at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.slice(0, 5).map((warning) => (
            <div
              key={warning.productKey}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertTriangle size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[var(--text)]">
                  {warning.label}
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {warning.code.replaceAll("_", " ")}
                </p>
              </div>

              <span className="shrink-0 text-xs font-bold text-[var(--text)]">
                {warning.balance} left
              </span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <button
          onClick={onViewInventory}
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] transition hover:gap-2"
        >
          Review inventory <ArrowRight size={14} />
        </button>
      )}
    </section>
  );
}
