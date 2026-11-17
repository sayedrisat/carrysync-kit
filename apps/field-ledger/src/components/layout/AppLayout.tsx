import type { ReactNode } from "react";
import Sidebar, { type AppPage } from "./Sidebar";
import Header from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  title: string;
  description: string;
  darkMode: boolean;
  toggleTheme: () => void;
  isOnline?: boolean;
}

export default function AppLayout({
  children,
  activePage,
  onNavigate,
  title,
  description,
  darkMode,
  toggleTheme,
  isOnline,
}: AppLayoutProps) {
  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
      />

      <main className="relative min-h-screen bg-[var(--background)] pb-20 transition-colors duration-300 md:ml-[250px] md:pb-0">
        <Header
          title={title}
          description={description}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />

        <div className="relative isolate mx-auto min-h-[calc(100vh-73px)] w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">

          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}