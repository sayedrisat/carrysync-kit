
import type { QuizSummary } from "@carrysync/domain/quiz-relay";

interface StudentQuizListProps {
  quizzes: QuizSummary[];
  onStart: (quizId: string) => void;
}

export default function StudentQuizList({
  quizzes,
  onStart,
}: StudentQuizListProps) {
  if (quizzes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--soft-surface)] text-2xl">
          📝
        </div>

        <h3 className="text-lg font-semibold text-[var(--text)]">
          No quizzes available
        </h3>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Import a quiz using its QR code to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {quizzes.map((quiz) => (
        <article
          key={quiz.quizId}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="mb-5 flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--soft-surface)] text-xl">
              📋
            </div>

            <span className="rounded-full bg-[var(--hover)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              {quiz.status === "ready" ? "Ready" : "Check status"}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text)]">
            {quiz.title}
          </h3>

          <p className="mt-2 text-sm text-[var(--muted)]">
            {quiz.questionCount} questions
          </p>

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={() => onStart(quiz.quizId)}
              disabled={quiz.status !== "ready"}
              className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Attempt Quiz →
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
