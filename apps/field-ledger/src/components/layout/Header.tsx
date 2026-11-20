
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
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/85 px-4 py-4 backdrop-blur-xl transition-all duration-500 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        {/* Page information */}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold tracking-tight text-[var(--text)] transition-colors duration-500 sm:text-2xl">
            {title}
          </h2>

          <p className="mt-1 hidden text-xs text-[var(--muted)] transition-colors duration-500 sm:block">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {/* Online status */}
          <div
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold transition-all duration-300 sm:flex ${
              isOnline
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {isOnline ? (
              <Wifi size={14} className="animate-pulse" />
            ) : (
              <WifiOff size={14} />
            )}

            {isOnline ? "Online" : "Offline"}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
            title={`Switch to ${darkMode ? "light" : "dark"} mode`}
            className="theme-toggle group relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--hover)] hover:shadow-md active:scale-90"
          >
            <span
              key={darkMode ? "sun" : "moon"}
              className="theme-icon-enter absolute"
            >
              {darkMode ? (
                <Sun
                  size={19}
                  className="text-amber-400 transition-colors duration-300"
                />
              ) : (
                <Moon
                  size={19}
                  className="text-[var(--primary)] transition-colors duration-300"
                />
              )}
            </span>
          </button>

          {/* Brand logo */}
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ecffb6] text-sm font-black text-[#00545f] shadow-sm transition-all duration-300 hover:rotate-3 hover:scale-105 dark:bg-[#d6fb00]">
            FL
          </div>
        </div>
      </div>
    </header>
  );
}
