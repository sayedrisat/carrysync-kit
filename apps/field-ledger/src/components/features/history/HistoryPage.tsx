
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Search,
  Package,
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

  return (
    <div className="space-y-6">
      {/* Heading */}
      <section>
        <span className="text-[10px] font-bold tracking-[1.5px] text-[var(--muted)]">
          ACTIVITY RECORDS
        </span>

        <h2 className="mt-2 text-2xl font-extrabold text-[var(--text)]">
          Movement history
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          A complete record of your inventory activity.
        </p>
      </section>

      {/* History summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Total records
            </span>
            <History size={20} className="text-[var(--primary)]" />
          </div>

          <p className="mt-3 text-2xl font-extrabold text-[var(--text)]">
            {history.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Imported records
            </span>
            <Package size={20} className="text-[var(--primary)]" />
          </div>

          <p className="mt-3 text-2xl font-extrabold text-[var(--text)]">
            {history.filter((item) => item.origin === "imported").length}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product history..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-4 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </div>

          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as DirectionFilter)
            }
            className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]"
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
            className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All sources</option>
            <option value="local">Local</option>
            <option value="imported">Imported</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text)]">
            All activity
          </h3>

          <span className="text-[10px] font-semibold text-[var(--muted)]">
            {filteredHistory.length} records
          </span>
        </div>

        {/* Empty state */}
        {filteredHistory.length === 0 ? (
          <div className="py-14 text-center">
            <History
              size={30}
              className="mx-auto mb-3 text-[var(--muted)]"
            />

            <p className="text-sm font-bold text-[var(--text)]">
              No history found
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              Try changing your filters or search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--table-head)]">
                  <th className="rounded-l-lg px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Product
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Movement
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Quantity
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Balance after
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Source
                  </th>

                  <th className="rounded-r-lg px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
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
                      className="border-b border-[var(--border)] last:border-0 transition hover:bg-[var(--hover)]"
                    >
                      <td className="px-4 py-4">
                        <p className="text-xs font-bold text-[var(--text)]">
                          {movement.productLabel}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            isIncoming
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
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

                      <td className="px-4 py-4 text-xs font-bold text-[var(--text)]">
                        {movement.quantity}
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold text-[var(--text)]">
                        {movement.balanceAfter}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[9px] font-bold capitalize text-[var(--muted)]">
                          {movement.origin}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[10px] text-[var(--muted)]">
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
