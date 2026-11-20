
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  History,
  QrCode,
  Boxes,
  Menu,
  X,
} from "lucide-react";

export type AppPage =
  | "dashboard"
  | "inventory"
  | "movements"
  | "history"
  | "sync";

interface SidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const navigation = [
  {
    label: "Overview",
    page: "dashboard" as AppPage,
    icon: LayoutDashboard,
  },
  {
    label: "Inventory",
    page: "inventory" as AppPage,
    icon: Package,
  },
  {
    label: "Movements",
    page: "movements" as AppPage,
    icon: ArrowLeftRight,
  },
  {
    label: "History",
    page: "history" as AppPage,
    icon: History,
  },
  {
    label: "QR Sync",
    page: "sync" as AppPage,
    icon: QrCode,
  },
];

export default function Sidebar({
  activePage,
  onNavigate,
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  // Prevent background scrolling while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close menu using Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <>
      {/* Mobile top navbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-6 lg:hidden">
        <Brand />

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-sidebar"
          className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--text)] transition hover:bg-[var(--hover)] active:scale-95"
        >
          {menuOpen ? <Menu size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-[var(--border)] bg-[var(--surface)] px-5 py-7 lg:flex">
        <Brand />

        <Navigation
          activePage={activePage}
          onNavigate={onNavigate}
        />

        <SidebarFooter />
      </aside>

      {/* Mobile overlay */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile slide-in sidebar */}
      <aside
        id="mobile-sidebar"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(290px,85vw)] flex-col border-r border-[var(--border)] bg-[var(--surface)] px-5 py-7 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand />

          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)]"
          >
            <X size={20} />
          </button>
        </div>

        <Navigation
          activePage={activePage}
          onNavigate={handleNavigate}
        />

        <SidebarFooter />
      </aside>
    </>
  );
}

/* Brand */
function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#00545f] text-[#d6fb00] shadow-sm">
        <Boxes size={23} />
      </div>

      <div>
        <h1 className="text-lg font-black tracking-tight text-[var(--text)]">
          CarrySync
        </h1>
        <p className="text-[10px] font-semibold tracking-wide text-[var(--muted)]">
          FIELD LEDGER
        </p>
      </div>
    </div>
  );
}

/* Navigation */
function Navigation({
  activePage,
  onNavigate,
}: {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}) {
  return (
    <>
      <p className="mb-3 mt-12 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--muted)]">
        Workspace
      </p>

      <nav className="flex flex-col gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.page;

          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              aria-current={active ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-[#b1d05b] text-[#00545f] dark:bg-[#d6fb00]/30 dark:text-[#aac706]"
                  : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
              }`}
            >
              <Icon
                size={18}
                className="shrink-0 transition-transform duration-200 group-hover:scale-110"
              />

              {item.label}

              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d6fb00]" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

/* Sidebar Footer */
function SidebarFooter() {
  return (
    <div className="mt-auto">
      <div className="rounded-2xl bg-[#ecffb6] p-4 dark:bg-[#12363b]">
        <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[#00545f] text-[#d6fb00]">
          <Boxes size={19} />
        </div>

        <p className="text-xs font-extrabold text-[#00545f] dark:text-[#ecffb6]">
          Stay organized
        </p>

        <p className="mt-1 text-[10px] leading-relaxed text-[#52777a] dark:text-[#a5c3b9]">
          Keep your inventory and stock movements in sync.
        </p>
      </div>

      <p className="mt-5 text-center text-[10px] text-[var(--muted)]">
        CarrySync Kit · Field Ledger
      </p>
    </div>
  );
}
