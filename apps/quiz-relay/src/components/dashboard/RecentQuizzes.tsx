
import {
  ArrowRight,
  CalendarDays,
  FileQuestion,
  Users,
  QrCode,
} from "lucide-react";

import type { TeacherQuizSummary } from "@carrysync/domain/quiz-relay";
import EmptyState from "./EmptyState";

interface RecentQuizzesProps {
  quizzes: TeacherQuizSummary[];
  onCreateQuiz: () => void;
  onShowQr: (quizId: string, title: string) => void;
}

export default function RecentQuizzes({
  quizzes,
  onCreateQuiz,
  onShowQr,
}: RecentQuizzesProps) {
  if (quizzes.length === 0) {
    return <EmptyState onCreateQuiz={onCreateQuiz} />;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-[var(--text)]">
            Recent quizzes
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Your recently available quizzes
          </p>
        </div>

        <span className="rounded-full bg-[var(--soft-surface)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
          {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}
        </span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {quizzes.slice(0, 5).map((quiz) => (
          <article
            key={quiz.quizId}
            className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[var(--hover)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
                <FileQuestion size={21} />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-[var(--text)]">
                  {quiz.title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                  <span>{quiz.questionCount} questions</span>

                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {quiz.participantCount} participants
                  </span>

                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} />
                    {new Date(quiz.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  quiz.status === "ready"
                    ? "bg-[var(--soft-surface)] text-[var(--primary)]"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {quiz.status === "ready" ? "Ready" : "Ambiguous"}
              </span>

              {quiz.hasAnswerKey && (
                <span className="text-[10px] font-semibold text-[var(--muted)]">
                  Answer key saved
                </span>
              )}

              <button
                type="button"
                onClick={() => onShowQr(quiz.quizId, quiz.title)}
                disabled={quiz.status !== "ready"}
                title="Show quiz QR code"
                className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--soft-surface)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <QrCode size={16} />
                <span>QR Code</span>
              </button>

              <ArrowRight
                size={17}
                className="text-[var(--muted)]"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
