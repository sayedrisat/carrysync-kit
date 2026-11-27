import { Plus } from "lucide-react";
import type { TeacherQuizSummary } from "@carrysync/domain/quiz-relay";

import StatsCards from "./StatsCards";
import RecentQuizzes from "./RecentQuizzes";

interface DashboardOverviewProps {
  quizzes: TeacherQuizSummary[];
  onCreateQuiz: () => void;
  onShowQr: (quizId: string, title: string) => void;
}

export default function DashboardOverview({
  quizzes,
  onCreateQuiz,
  onShowQr,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--primary)] p-6 text-[#ecffb6] sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[30px] border-[#ecffb6]/10" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ecffb6]/15 px-3 py-1.5 text-xs font-semibold text-[#ecffb6]">
            Your offline classroom workspace
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome to QuizRelay
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#ecffb6]/80 sm:text-base">
            Create quizzes, share them with students through QR codes,
            and collect answers without needing an internet connection.
          </p>

          <button
            type="button"
            onClick={onCreateQuiz}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d6fb00] px-5 py-3 text-sm font-extrabold text-[#00545f] transition-all hover:bg-[#ecffb6] active:scale-95"
          >
            <Plus size={17} />
            Create a quiz
          </button>
        </div>
      </section>

      <StatsCards quizzes={quizzes} />

      {/* Recent quizzes */}
      <div>
        <RecentQuizzes
          quizzes={quizzes}
          onCreateQuiz={onCreateQuiz}
          onShowQr={onShowQr}
        />
      </div>
    </div>
  );
}
