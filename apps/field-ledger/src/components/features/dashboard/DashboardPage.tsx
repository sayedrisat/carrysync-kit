
import {
  AlertTriangle,
  Boxes,
  CircleOff,
  Package,
  Plus,
  Minus,
  LayoutDashboard,
  ArrowUpRight,
} from "lucide-react";

import type { ReactNode } from "react";
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
      {/* Dashboard hero */}
     
<section className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--soft-surface)] via-[var(--surface)] to-[var(--background)] p-4 shadow-sm transition-colors duration-500 sm:rounded-3xl sm:p-6 lg:p-7">
  <div className="relative z-10 flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">

    {/* Hero content */}
    <div className="min-w-0 flex-1">
      <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-[var(--background)] sm:h-9 sm:w-9 sm:rounded-xl">
          <LayoutDashboard size={17} />
        </div>

        <span className="text-[9px] font-extrabold tracking-[1.5px] text-[var(--muted)] sm:text-[10px] sm:tracking-[1.8px]">
          YOUR STORE AT A GLANCE
        </span>
      </div>

      <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)] min-[400px]:text-2xl sm:text-3xl">
        Inventory overview
      </h2>

      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-sm">
        Keep track of your stock, monitor product movements and
        manage your inventory from one place.
      </p>

      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 sm:mt-4 sm:px-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)] sm:h-2 sm:w-2" />

        <span className="truncate text-[10px] font-bold text-[var(--text)] sm:text-xs">
          {products.length} products being tracked
        </span>
      </div>
    </div>

    {/* Action buttons */}
    <div className="grid w-full grid-cols-2 gap-2 sm:max-w-sm lg:w-auto lg:min-w-[155px] lg:grid-cols-1">
      <button
        type="button"
        onClick={onAddStock}
        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-xs font-bold text-[var(--background)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:scale-95 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
      >
        <Plus size={16} />
        <span>Add stock</span>
      </button>

      <button
        type="button"
        onClick={onRemoveStock}
        disabled={products.length === 0}
        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--text)] transition-all duration-200 hover:bg-[var(--hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
      >
        <Minus size={15} />
        <span>Remove stock</span>
      </button>
    </div>
  </div>

  {/* Decorative background */}
  <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl sm:h-48 sm:w-48" />

  <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl sm:right-32 sm:h-40 sm:w-40" />
</section>


      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total products"
          value={products.length}
          helper="Products in your catalog"
          icon={<Package size={20} />}
          accent="teal"
        />

        <StatCard
          label="Total stock units"
          value={totalUnits}
          helper="Units currently available"
          icon={<Boxes size={20} />}
          accent="lime"
        />

        <StatCard
          label="Low stock items"
          value={lowStockCount}
          helper="Need restocking soon"
          icon={<AlertTriangle size={20} />}
          accent="amber"
        />

        <StatCard
          label="Out of stock"
          value={outOfStockCount}
          helper="Currently unavailable"
          icon={<CircleOff size={20} />}
          accent="rose"
        />
      </section>

      {/* Inventory and recent activity */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
        <InventorySummary
          products={products}
          onViewAll={() => onNavigate("inventory")}
        />

        <RecentMovements movements={history} />
      </section>

      {/* Low stock alerts */}
      <LowStockAlerts
        warnings={warnings}
        onViewInventory={() => onNavigate("inventory")}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  accent: "teal" | "lime" | "amber" | "rose";
}

function StatCard({
  label,
  value,
  helper,
  icon,
  accent,
}: StatCardProps) {
  const accents = {
    teal: {
      line: "bg-[#00818b]",
      icon: "bg-[#00818b]/10 text-[#00818b] dark:bg-[#00818b]/20 dark:text-[#76dce2]",
      glow: "bg-[#00818b]/10",
    },
    lime: {
      line: "bg-[#a3c900]",
      icon: "bg-[#d6fb00]/20 text-[#596707] dark:bg-[#d6fb00]/15 dark:text-[#d6fb00]",
      glow: "bg-[#d6fb00]/10",
    },
    amber: {
      line: "bg-amber-500",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
      glow: "bg-amber-500/10",
    },
    rose: {
      line: "bg-rose-500",
      icon: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
      glow: "bg-rose-500/10",
    },
  };

  const style = accents[accent];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Accent top border */}
      <div className={`absolute left-0 top-0 h-1 w-full ${style.line}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-[var(--muted)]">
            {label}
          </p>

          <strong className="mt-4 block text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">
            {value.toLocaleString()}
          </strong>
        </div>

        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 ${style.icon}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.line}`} />
          <p className="truncate text-[11px] font-medium text-[var(--muted)]">
            {helper}
          </p>
        </div>

        <ArrowUpRight
          size={16}
          className="shrink-0 text-[var(--muted)] opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </div>

      {/* Decorative glow */}
      <div
        className={`pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${style.glow}`}
      />
    </article>
  );
}
