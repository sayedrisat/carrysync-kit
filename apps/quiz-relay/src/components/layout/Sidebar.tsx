
import { BookOpen, LayoutDashboard, PlusCircle, X } from "lucide-react";

type Page = "dashboard" | "create" ;

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  {
    id: "dashboard" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "create" as const,
    label: "Create a quiz",
    icon: PlusCircle,
  },
];

export default function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
}: SidebarProps) {
  function handleNavigation(page: Page) {
    onNavigate(page);
    onClose();
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[#d6fb00] shadow-sm">
              <BookOpen size={21} strokeWidth={2} />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-[var(--text)]">
                QuizRelay
              </h1>
              <p className="text-xs font-medium text-[var(--muted)]">
                by CarrySync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--muted)]">
            Workspace
          </p>

          <nav className="space-y-2" aria-label="Main navigation">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigation(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-[#b1d05b] text-[#00545f] dark:bg-[#d6fb00]/30 dark:text-[#aac706]"
                  : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
              }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={1.9}
                    className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                  />

                  {item.label}

                  {isActive && (
                     <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d6fb00]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[var(--border)] p-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft-surface)] p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[#d6fb00]">
              <BookOpen size={18} />
            </div>

            <p className="text-sm font-extrabold text-[var(--text)]">
              Offline-first learning
            </p>

            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Share quizzes and collect responses through QR codes.
            </p>
          </div>

          <p className="mt-5 text-center text-[10px] font-medium text-[var(--muted)]">
            CarrySync Kit · QuizRelay
          </p>
        </div>
      </aside>
    </>
  );
}
