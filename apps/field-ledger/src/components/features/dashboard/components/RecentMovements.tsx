
import { ArrowDownLeft, ArrowUpRight, Clock3 } from "lucide-react";
import type { useInventory } from "../../../../hooks/useInventory";

type Movement = ReturnType<typeof useInventory>["history"][number];

interface Props {
  movements: Movement[];
}

export default function RecentMovements({ movements }: Props) {
  if (movements.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h3 className="font-bold text-[var(--text)]">Recent activity</h3>
        <div className="flex flex-col items-center py-10 text-center">
          <Clock3 size={28} className="mb-3 text-[var(--muted)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            No movements yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Your stock activity will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h3 className="font-bold text-[var(--text)]">Recent activity</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Latest stock movements
        </p>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {movements.slice(0, 5).map((movement) => {
          const isIn = movement.direction === "in";

          return (
            <div
              key={movement.eventId}
              className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  isIn
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                }`}
              >
                {isIn ? (
                  <ArrowDownLeft size={19} />
                ) : (
                  <ArrowUpRight size={19} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-bold text-[var(--text)]">
                  {movement.productLabel}
                </strong>
                <span className="mt-1 block text-[10px] text-[var(--muted)]">
                  Stock {movement.direction.toUpperCase()} ·{" "}
                  {new Date(movement.createdAt).toLocaleString()}
                </span>
                <small className="mt-1 block text-[10px] text-[var(--muted)]">
                  Balance after movement: {movement.balanceAfter}
                </small>
              </div>

              <strong
                className={`shrink-0 text-sm font-extrabold ${
                  isIn ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                }`}
              >
                {isIn ? "+" : "−"}{movement.quantity}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
