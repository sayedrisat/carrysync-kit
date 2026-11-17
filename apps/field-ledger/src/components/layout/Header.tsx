import { Moon, Sun, Wifi, WifiOff } from "lucide-react";

interface HeaderProps {
  title: string;
  description: string;
  darkMode: boolean;
  toggleTheme: () => void;
  isOnline?: boolean;
}

export default function Header({
  title,
  description,
  darkMode,
  toggleTheme,
  isOnline = true,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold tracking-tight text-[var(--text)] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 hidden text-xs text-[var(--muted)] sm:block">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold sm:flex ${
              isOnline
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Online" : "Offline"}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:-translate-y-0.5 hover:bg-[var(--hover)]"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ecffb6] text-sm font-black text-[#00545f] dark:bg-[#d6fb00]">
            FL
          </div>
        </div>
      </div>
    </header>
  );
}