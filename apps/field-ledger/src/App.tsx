
import { useState } from "react";

import Sidebar, { type AppPage } from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

import DashboardPage from "./components/features/dashboard/DashboardPage";
import InventoryPage from "./components/features/inventory/InventoryPage";
import MovementsPage from "./components/features/movements/MovementsPage";
import HistoryPage from "./components/features/history/HistoryPage";
import SyncPage from "./components/features/qr-sync/SyncPage";

import { useInventory } from "./hooks/useInventory";

import type { MovementDraft } from "./components/features/inventory/components/ProductForm";

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
  const [activePage, setActivePage] =
    useState<AppPage>("dashboard");

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
    <div className={`app-shell min-h-screen ${darkMode ? "dark" : ""}`}>
      {/* Responsive Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {/* Main content */}
      <main
        className="
          min-h-screen
          bg-[var(--background)]
          pt-16
          transition-colors duration-300
          lg:ml-[250px]
          lg:pt-0
        "
      >
        {/* Page Header */}
        <Header
          title={title}
          description={description}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />

        {/* Page Content */}
        <div
          className="
            relative isolate mx-auto
            min-h-screen w-full max-w-[1500px]
            px-4 py-5
            sm:px-6 sm:py-6
            lg:px-8 lg:py-9
            xl:px-10
          "
        >
          <div className="relative z-10">

            {/* Loading State */}
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />

                Loading your inventory...
              </div>
            ) : error ? (
              /* Error State */
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </div>
            ) : (
              <>
                {/* Dashboard */}
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

                {/* Inventory */}
                {activePage === "inventory" && (
                  <InventoryPage
                    products={products}
                    warnings={warnings}
                    onRecordMovement={handleRecordMovement}
                  />
                )}

                {/* Movements */}
                {activePage === "movements" && (
                  <MovementsPage
                    products={products}
                    history={history}
                    onRecordMovement={handleRecordMovement}
                  />
                )}

                {/* History */}
                {activePage === "history" && (
                  <HistoryPage history={history} />
                )}

                {/* QR Sync */}
                {activePage === "sync" && <SyncPage />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
