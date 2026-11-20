
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Search,
  Package,
  SlidersHorizontal,
} from "lucide-react";

import type { useInventory } from "../../../hooks/useInventory";

type InventoryData = ReturnType<typeof useInventory>;
type Movement = InventoryData["history"][number];

interface Props {
  history: Movement[];
}

type DirectionFilter = "all" | "in" | "out";
type OriginFilter = "all" | "local" | "imported" | "unknown";

export default function HistoryPage({ history }: Props) {
  const [search, setSearch] = useState("");
  const [direction, setDirection] =
    useState<DirectionFilter>("all");
  const [origin, setOrigin] =
    useState<OriginFilter>("all");

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((movement) => {
      const matchesSearch =
        movement.productLabel.toLowerCase().includes(query);

      const matchesDirection =
        direction === "all" ||
        movement.direction === direction;

      const matchesOrigin =
        origin === "all" ||
        movement.origin === origin;

      return (
        matchesSearch &&
        matchesDirection &&
        matchesOrigin
      );
    });
  }, [history, search, direction, origin]);

  const importedCount = history.filter(
    (item) => item.origin === "imported"
  ).length;

  const incomingCount = history.filter(
    (item) => item.direction === "in"
  ).length;

  const outgoingCount = history.filter(
    (item) => item.direction === "out"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page hero */}
<section className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--soft-surface)] via-[var(--surface)] to-[var(--background)] p-4 shadow-sm transition-colors duration-500 sm:rounded-3xl sm:p-6 lg:p-7">
  <div className="relative z-10 flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="min-w-0 flex-1">
      <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-[var(--background)] sm:h-9 sm:w-9 sm:rounded-xl">
          <History size={17} />
        </div>

        <span className="text-[9px] font-extrabold tracking-[1.5px] text-[var(--muted)] sm:text-[10px] sm:tracking-[1.8px]">
          ACTIVITY RECORDS
        </span>
      </div>

      <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)] min-[400px]:text-2xl sm:text-3xl">
        Movement history
      </h2>

      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-sm">
        A complete record of your inventory activity. Review stock changes,
        track sources and monitor every movement.
      </p>

      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 sm:mt-4 sm:px-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)] sm:h-2 sm:w-2" />
        <span className="truncate text-[10px] font-bold text-[var(--text)] sm:text-xs">
          {history.length} total activity records
        </span>
      </div>
    </div>

    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:min-w-[190px]">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:rounded-2xl sm:p-4">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 sm:h-8 sm:w-8">
          <ArrowDownLeft size={17} />
        </div>

        <p className="mt-2 text-xl font-extrabold tabular-nums text-[var(--text)] sm:mt-3 sm:text-2xl">
          {incomingCount}
        </p>

        <p className="text-[10px] font-semibold text-[var(--muted)] sm:text-xs">
          Incoming
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:rounded-2xl sm:p-4">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 sm:h-8 sm:w-8">
          <ArrowUpRight size={17} />
        </div>

        <p className="mt-2 text-xl font-extrabold tabular-nums text-[var(--text)] sm:mt-3 sm:text-2xl">
          {outgoingCount}
        </p>

        <p className="text-[10px] font-semibold text-[var(--muted)] sm:text-xs">
          Outgoing
        </p>
      </div>
    </div>
  </div>

  <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl sm:h-48 sm:w-48" />
  <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl sm:right-32 sm:h-40 sm:w-40" />
</section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Total records
            </span>

            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
              <History size={20} />
            </span>
          </div>

          <p className="mt-5 text-3xl font-extrabold tracking-tight text-[var(--text)]">
            {history.length.toLocaleString()}
          </p>

          <p className="mt-2 text-[11px] text-[var(--muted)]">
            All recorded inventory activities
          </p>
        </div>

        <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Imported records
            </span>

            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
              <Package size={20} />
            </span>
          </div>

          <p className="mt-5 text-3xl font-extrabold tracking-tight text-[var(--text)]">
            {importedCount.toLocaleString()}
          </p>

          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Records received from external transfers
          </p>
        </div>
      </section>

      {/* History table card */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {/* Section heading */}
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <h3 className="text-base font-extrabold text-[var(--text)]">
            Activity history
          </h3>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Search, filter and review your inventory records.
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-3 border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            <SlidersHorizontal size={14} />
            Filter activity
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product history..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-4 text-xs text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              />
            </div>

            <select
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as DirectionFilter)
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-semibold text-[var(--text)] outline-none transition focus:border-[var(--primary)] lg:w-auto"
            >
              <option value="all">All directions</option>
              <option value="in">Stock IN</option>
              <option value="out">Stock OUT</option>
            </select>

            <select
              value={origin}
              onChange={(event) =>
                setOrigin(event.target.value as OriginFilter)
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-semibold text-[var(--text)] outline-none transition focus:border-[var(--primary)] lg:w-auto"
            >
              <option value="all">All sources</option>
              <option value="local">Local</option>
              <option value="imported">Imported</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Table heading */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text)]">
              All activity
            </h3>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Your inventory movement records
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--soft-surface)] px-3 py-1.5 text-[10px] font-bold text-[var(--text)]">
            {filteredHistory.length} records
          </span>
        </div>

        {/* Empty state */}
        {filteredHistory.length === 0 ? (
          <div className="px-4 pb-5 sm:px-5">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] px-5 py-14 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--soft-surface)] text-[var(--primary)]">
                <History size={25} />
              </div>

              <p className="text-sm font-bold text-[var(--text)]">
                No history found
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Try changing your filters or search term.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto px-4 pb-4 sm:px-5 sm:pb-5">
            <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="rounded-l-xl bg-[var(--background)] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Product
                  </th>

                  <th className="bg-[var(--background)] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Movement
                  </th>

                  <th className="bg-[var(--background)] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Quantity
                  </th>

                  <th className="bg-[var(--background)] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Balance after
                  </th>

                  <th className="bg-[var(--background)] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Source
                  </th>

                  <th className="rounded-r-xl bg-[var(--background)] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((movement) => {
                  const isIncoming = movement.direction === "in";

                  return (
                    <tr
                      key={movement.eventId}
                      className="group transition hover:bg-[var(--hover)]"
                    >
                      <td className="border-b border-[var(--border)] px-4 py-4">
                        <p className="text-xs font-bold text-[var(--text)]">
                          {movement.productLabel}
                        </p>
                      </td>

                      <td className="border-b border-[var(--border)] px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
                            isIncoming
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft size={12} />
                          ) : (
                            <ArrowUpRight size={12} />
                          )}

                          {isIncoming ? "Stock IN" : "Stock OUT"}
                        </span>
                      </td>

                      <td className="border-b border-[var(--border)] px-4 py-4 text-xs font-bold text-[var(--text)]">
                        {movement.quantity}
                      </td>

                      <td className="border-b border-[var(--border)] px-4 py-4 text-xs font-semibold text-[var(--text)]">
                        {movement.balanceAfter}
                      </td>

                      <td className="border-b border-[var(--border)] px-4 py-4">
                        <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[9px] font-bold capitalize text-[var(--muted)]">
                          {movement.origin}
                        </span>
                      </td>

                      <td className="border-b border-[var(--border)] px-4 py-4 text-[10px] text-[var(--muted)]">
                        {new Date(movement.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
