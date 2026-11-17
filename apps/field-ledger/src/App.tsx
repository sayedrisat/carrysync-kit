
import { useState } from "react";

import Sidebar, { type AppPage } from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

import DashboardPage from "./components/features/dashboard/DashboardPage";
import InventoryPage from "./components/features/inventroy/InventoryPage";
import MovementsPage from "./components/features/movements/MovementsPage";
import HistoryPage from "./components/features/history/HistoryPage";

import { useInventory } from "./hooks/useInventory";

import type { MovementDraft } from "./components/features/inventroy/components/ProductForm";

const pageInfo: Record<
  AppPage,
  { title: string; description: string }
> = {
  dashboard: {
    title: "Overview",
    description: "Here's what's happening with your inventory today.",
  },
  inventory: {
    title: "Inventory",
    description: "Manage and monitor your products.",
  },
  movements: {
    title: "Movements",
    description: "Track incoming and outgoing stock.",
  },
  history: {
    title: "Movement history",
    description: "Review your complete inventory activity.",
  },
  sync: {
    title: "QR Sync",
    description: "Transfer inventory data between devices.",
  },
};

function App() {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("fieldledger-theme") === "dark"
  );

  const {
    service,
    products,
    warnings,
    history,
    loading,
    error,
  } = useInventory();

  // Theme toggle
  const toggleTheme = () => {
    setDarkMode((previous) => {
      const next = !previous;

      localStorage.setItem(
        "fieldledger-theme",
        next ? "dark" : "light"
      );

      return next;
    });
  };

  // Shared stock movement handler
  const handleRecordMovement = async (draft: MovementDraft) => {
    if (!service) {
      throw new Error(
        "Inventory service is not ready. Please try again."
      );
    }

    await service.recordMovement(draft);
  };

  const { title, description } = pageInfo[activePage];

  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {/* Main content */}
      <main className="ml-0 min-h-screen bg-[var(--background)] transition-colors duration-300 md:ml-[250px]">
        {/* Header */}
        <Header
          title={title}
          description={description}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />

        <div className="relative isolate mx-auto min-h-screen w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="relative z-10">

            {/* Loading state */}
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />

                Loading your inventory...
              </div>
            ) : error ? (
              /* Error state */
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </div>
            ) : (
              <>
                {/* DASHBOARD */}
                {activePage === "dashboard" && (
                  <DashboardPage
                    products={products}
                    warnings={warnings}
                    history={history}
                    onNavigate={setActivePage}
                    onAddStock={() => setActivePage("movements")}
                    onRemoveStock={() => setActivePage("movements")}
                  />
                )}

                {/* INVENTORY */}
                {activePage === "inventory" && (
                  <InventoryPage
                    products={products}
                    warnings={warnings}
                    onRecordMovement={handleRecordMovement}
                  />
                )}

                {/* MOVEMENTS */}
                {activePage === "movements" && (
                  <MovementsPage
                    products={products}
                    history={history}
                    onRecordMovement={handleRecordMovement}
                  />
                )}

                {/* HISTORY */}
                {activePage === "history" && (
                  <HistoryPage
                    history={history}
                  />
                )}

                {/* QR SYNC */}
                {activePage === "sync" && (
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
                    <span className="text-[10px] font-bold tracking-[1.5px] text-[var(--muted)]">
                      DATA TRANSFER
                    </span>

                    <h2 className="mt-2 text-2xl font-extrabold text-[var(--text)]">
                      QR Sync
                    </h2>

                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Transfer inventory data between devices using QR codes.
                    </p>

                    <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-xs text-[var(--muted)]">
                      Your QR Sync components are ready to be connected here.
                      The existing IndexedDB inventory service remains unchanged.
                    </p>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
