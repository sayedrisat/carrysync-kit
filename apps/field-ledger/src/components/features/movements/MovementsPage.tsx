
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Plus,
  Search,
  X,
  Package,
} from "lucide-react";

import type { useInventory } from "../../../hooks/useInventory";
import MovementForm, {
  type MovementDraft,
} from "./components/MovementForm";

type InventoryData = ReturnType<typeof useInventory>;
type Product = InventoryData["products"][number];
type Movement = InventoryData["history"][number];

interface Props {
  products: Product[];
  history: Movement[];
  onRecordMovement: (draft: MovementDraft) => Promise<void>;
}

export default function MovementsPage({
  products,
  history,
  onRecordMovement,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [showForm, setShowForm] = useState(false);

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((movement) => {
      const matchesSearch = movement.productLabel
        .toLowerCase()
        .includes(query);

      const matchesFilter =
        filter === "all" || movement.direction === filter;

      return matchesSearch && matchesFilter;
    });
  }, [history, search, filter]);

  const handleSubmit = async (draft: MovementDraft) => {
    await onRecordMovement(draft);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-bold tracking-[1.5px] text-[var(--muted)]">
            STOCK OPERATIONS
          </span>

          <h2 className="mt-2 text-2xl font-extrabold text-[var(--text)]">
            Movements
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Track incoming and outgoing inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 dark:text-[#071c20]"
        >
          <Plus size={16} />
          Record movement
        </button>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Total movements
            </span>
            <Clock3 size={19} className="text-[var(--primary)]" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[var(--text)]">
            {history.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Stock received
            </span>
            <ArrowDownLeft size={19} className="text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {history
              .filter((item) => item.direction === "in")
              .reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Stock issued
            </span>
            <ArrowUpRight size={19} className="text-red-500" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-red-500">
            {history
              .filter((item) => item.direction === "out")
              .reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
      </section>

      {/* Movement list */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product movements..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-4 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "all" | "in" | "out")
            }
            className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All movements</option>
            <option value="in">Stock IN</option>
            <option value="out">Stock OUT</option>
          </select>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="py-14 text-center">
            <Package
              size={30}
              className="mx-auto mb-3 text-[var(--muted)]"
            />
            <p className="text-sm font-bold text-[var(--text)]">
              No movements found
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Record a movement or try another search.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMovements.map((movement) => {
              const isIncoming = movement.direction === "in";

              return (
                <div
                  key={movement.eventId}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 transition hover:bg-[var(--hover)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        isIncoming
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-500 dark:bg-red-950/40 dark:text-red-400"
                      }`}
                    >
                      {isIncoming ? (
                        <ArrowDownLeft size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text)]">
                        {movement.productLabel}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {new Date(movement.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p
                        className={`text-sm font-extrabold ${
                          isIncoming
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500"
                        }`}
                      >
                        {isIncoming ? "+" : "-"}
                        {movement.quantity} units
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        Balance: {movement.balanceAfter}
                      </p>
                    </div>

                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                      {movement.origin}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Movement form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="movement-form-title"
            className="my-auto w-full max-w-[460px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-[1.4px] text-[var(--muted)]">
                  INVENTORY ACTION
                </span>
                <h2
                  id="movement-form-title"
                  className="mt-2 text-xl font-extrabold"
                >
                  Record movement
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Add or remove product stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--hover)] text-[var(--muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <MovementForm
              products={products}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </section>
        </div>
      )}
    </div>
  );
}
