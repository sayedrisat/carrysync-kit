import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  History,
  QrCode,
  Boxes,
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
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-[var(--border)] bg-[var(--surface)] px-5 py-7 md:flex">
        <Brand />

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
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-[#ecffb6] text-[#00545f] dark:bg-[#d6fb00]/15 dark:text-[#d6fb00]"
                    : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={18} />
                {item.label}

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d6fb00]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-[#ecffb6] p-4 dark:bg-[#12363b]">
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
      </aside>

      {/* Mobile navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] px-1 py-2 md:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.page;

          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[9px] font-bold ${
                active
                  ? "text-[#00545f] dark:text-[#d6fb00]"
                  : "text-[var(--muted)]"
              }`}
            >
              <Icon size={19} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#00545f] text-[#d6fb00] shadow-sm">
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
