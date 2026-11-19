
import {
  AlertTriangle,
  Boxes,
  CircleOff,
  Package,
  Plus,
  Minus,
} from "lucide-react";

import type { useInventory } from "../../../hooks/useInventory";
import type { AppPage } from "../../layout/Sidebar";

import InventorySummary from "./components/InventorySummary";
import LowStockAlerts from "./components/LowStockAlerts";
import RecentMovements from "./components/RecentMovements";

type InventoryData = ReturnType<typeof useInventory>;

interface Props {
  products: InventoryData["products"];
  warnings: InventoryData["warnings"];
  history: InventoryData["history"];
  onNavigate: (page: AppPage) => void;
  onAddStock: () => void;
  onRemoveStock: () => void;
}

export default function DashboardPage({
  products,
  warnings,
  history,
  onNavigate,
  onAddStock,
  onRemoveStock,
}: Props) {
  const totalUnits = products.reduce(
    (sum, product) => sum + Math.max(0, product.balance),
    0
  );

  const lowStockCount = products.filter(
    (product) => product.status === "low"
  ).length;

  const outOfStockCount = products.filter(
    (product) => product.status === "out"
  ).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-bold tracking-[1.5px] text-[var(--muted)]">
            YOUR STORE AT A GLANCE
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text)]">
            Inventory overview
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Keep track of your stock, all in one place.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRemoveStock}
            disabled={products.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            <Minus size={15} />
            Remove stock
          </button>

          <button
            onClick={onAddStock}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 sm:flex-none dark:text-[#071c20]"
          >
            <Plus size={15} />
            Add stock
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total products"
          value={products.length}
          helper="Products in your catalog"
          icon={<Package size={19} />}
        />
        <StatCard
          label="Total stock units"
          value={totalUnits}
          helper="Units currently available"
          icon={<Boxes size={19} />}
        />
        <StatCard
          label="Low stock items"
          value={lowStockCount}
          helper="Need restocking soon"
          icon={<AlertTriangle size={19} />}
          warning
        />
        <StatCard
          label="Out of stock"
          value={outOfStockCount}
          helper="Currently unavailable"
          icon={<CircleOff size={19} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
        <InventorySummary
          products={products}
          onViewAll={() => onNavigate("inventory")}
        />
        <RecentMovements movements={history} />
      </section>

      <LowStockAlerts
        warnings={warnings}
        onViewInventory={() => onNavigate("inventory")}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
  warning = false,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[var(--muted)]">
          {label}
        </span>
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${
            warning
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-[var(--soft-surface)] text-[var(--primary)]"
          }`}
        >
          {icon}
        </span>
      </div>

      <strong className="mt-5 block text-3xl font-extrabold tracking-tight text-[var(--text)]">
        {value.toLocaleString()}
      </strong>

      <p className="mt-1 text-[11px] text-[var(--muted)]">{helper}</p>
    </article>
  );
}
