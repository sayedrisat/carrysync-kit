
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
  {/* Page hero */}
  <section className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--soft-surface)] via-[var(--surface)] to-[var(--background)] p-4 shadow-sm transition-colors duration-500 sm:rounded-3xl sm:p-6 lg:p-7">
  <div className="relative z-10 flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="min-w-0 flex-1">
      <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-[var(--background)] sm:h-9 sm:w-9 sm:rounded-xl">
          <ArrowDownLeft size={17} />
        </div>

        <span className="text-[9px] font-extrabold tracking-[1.5px] text-[var(--muted)] sm:text-[10px] sm:tracking-[1.8px]">
          STOCK OPERATIONS
        </span>
      </div>

      <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)] min-[400px]:text-2xl sm:text-3xl">
        Movements
      </h2>

      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-sm">
        Track incoming and outgoing inventory, monitor stock changes and
        keep your product records organized.
      </p>

      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 sm:mt-4 sm:px-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)] sm:h-2 sm:w-2" />
        <span className="truncate text-[10px] font-bold text-[var(--text)] sm:text-xs">
          {history.length} recorded movements
        </span>
      </div>
    </div>

    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-[var(--background)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:scale-95 sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
    >
      <Plus size={16} />
      Record movement
    </button>
  </div>

  <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl sm:h-48 sm:w-48" />
  <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl sm:right-32 sm:h-40 sm:w-40" />
</section>

  {/* Summary cards */}

<section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  {/* Total movements */}
  <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
    <div className="absolute left-0 top-0 h-1 w-full bg-[#00818b]" />

    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-[var(--muted)]">
          Total movements
        </p>

        <p className="mt-4 text-3xl font-black tracking-tight text-[var(--text)]">
          {history.length.toLocaleString()}
        </p>
      </div>

      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#00818b]/10 text-[#00818b] transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 dark:bg-[#00818b]/20 dark:text-[#76dce2]">
        <Clock3 size={21} />
      </span>
    </div>

    <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-3">
      <span className="h-2 w-2 rounded-full bg-[#00818b]" />
      <p className="text-[11px] font-medium text-[var(--muted)]">
        All recorded stock activities
      </p>
    </div>

    <div className="pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full bg-[#00818b]/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
  </article>

  {/* Stock received */}
  <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
    <div className="absolute left-0 top-0 h-1 w-full bg-emerald-500" />

    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-[var(--muted)]">
          Stock received
        </p>

        <p className="mt-4 text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
          {history
            .filter((item) => item.direction === "in")
            .reduce((sum, item) => sum + item.quantity, 0)
            .toLocaleString()}
        </p>
      </div>

      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 dark:bg-emerald-400/15 dark:text-emerald-300">
        <ArrowDownLeft size={21} />
      </span>
    </div>

    <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-3">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <p className="text-[11px] font-medium text-[var(--muted)]">
        Total units added to inventory
      </p>
    </div>

    <div className="pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full bg-emerald-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
  </article>

  {/* Stock issued */}
  <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
    <div className="absolute left-0 top-0 h-1 w-full bg-rose-500" />

    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-[var(--muted)]">
          Stock issued
        </p>

        <p className="mt-4 text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
          {history
            .filter((item) => item.direction === "out")
            .reduce((sum, item) => sum + item.quantity, 0)
            .toLocaleString()}
        </p>
      </div>

      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 dark:bg-rose-400/15 dark:text-rose-300">
        <ArrowUpRight size={21} />
      </span>
    </div>

    <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-3">
      <span className="h-2 w-2 rounded-full bg-rose-500" />
      <p className="text-[11px] font-medium text-[var(--muted)]">
        Total units removed from inventory
      </p>
    </div>

    <div className="pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full bg-rose-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
  </article>
</section>


  {/* Movement list */}
  <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
    <div className="border-b border-[var(--border)] p-4 sm:p-5">
      <h3 className="text-base font-extrabold text-[var(--text)]">
        Movement history
      </h3>

      <p className="mt-1 text-xs text-[var(--muted)]">
        View and filter all your incoming and outgoing stock activities.
      </p>
    </div>

    {/* Search and filter */}
    <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="relative w-full sm:max-w-sm">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product movements..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-4 text-xs text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
      </div>

      <select
        value={filter}
        onChange={(event) =>
          setFilter(event.target.value as "all" | "in" | "out")
        }
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-semibold text-[var(--text)] outline-none transition focus:border-[var(--primary)] sm:w-auto"
      >
        <option value="all">All movements</option>
        <option value="in">Stock IN</option>
        <option value="out">Stock OUT</option>
      </select>
    </div>

    {/* Movement records */}
    <div className="space-y-3 p-4 sm:p-5">
      {filteredMovements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] px-5 py-14 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--soft-surface)] text-[var(--primary)]">
            <Package size={25} />
          </div>

          <p className="text-sm font-bold text-[var(--text)]">
            No movements found
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Record a movement or try another search.
          </p>
        </div>
      ) : (
        filteredMovements.map((movement) => {
          const isIncoming = movement.direction === "in";

          return (
            <div
              key={movement.eventId}
              className="group flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--hover)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    isIncoming
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
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

              <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-5">
                <div className="text-left sm:text-right">
                  <p
                    className={`text-sm font-extrabold ${
                      isIncoming
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isIncoming ? "+" : "-"}
                    {movement.quantity} units
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    Balance: {movement.balanceAfter}
                  </p>
                </div>

                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  {movement.origin}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  </section>

  {/* Movement form modal */}
  {showForm && (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
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
              id="movement-form-title"
              className="text-xl font-extrabold tracking-tight"
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]"
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
