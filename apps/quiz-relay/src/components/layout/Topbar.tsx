
import { Menu, Plus, WifiOff } from "lucide-react";

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
  onCreateQuiz: () => void;
}

export default function Topbar({
  title,
  onMenuClick,
  onCreateQuiz,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/90 px-5 backdrop-blur-md sm:px-8">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div>

          <h1 className="mt-1 text-lg font-extrabold tracking-tight text-[var(--text)] sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Offline indicator */}
        <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--soft-surface)] px-3 py-2 sm:flex">
          <WifiOff size={14} className="text-[var(--primary)]" />

          <span className="text-xs font-semibold text-[var(--text)]">
            Offline-first
          </span>
        </div>

        {/* Create quiz button */}
        <button
          type="button"
          onClick={onCreateQuiz}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-bold text-[#ecffb6] shadow-sm transition-all duration-200 hover:brightness-110 active:scale-95 sm:px-4"
        >
          <Plus size={17} strokeWidth={2.5} />

          <span className="hidden sm:inline">Create quiz</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>
    </header>
  );
}
