
import { FileQuestion, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateQuiz: () => void;
}

export default function EmptyState({ onCreateQuiz }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--soft-surface)] text-[var(--primary)]">
        <FileQuestion size={30} strokeWidth={1.7} />
      </div>

      <h3 className="text-lg font-bold text-[var(--text)]">
        No quizzes yet
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        Create your first quiz, share it with students through QR codes,
        and collect their responses offline.
      </p>

      <button
        type="button"
        onClick={onCreateQuiz}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[#ecffb6] transition hover:brightness-110 active:scale-95"
      >
        <Plus size={17} />
        Create your first quiz
      </button>
    </div>
  );
}
