
import { Eye, FileQuestion } from "lucide-react";
import type { BuilderQuestion } from "./QuestionCard";

interface QuizPreviewProps {
  title: string;
  questions: BuilderQuestion[];
}

export default function QuizPreview({
  title,
  questions,
}: QuizPreviewProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--soft-surface)] text-[var(--primary)]">
          <Eye size={18} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text)]">
            Quiz preview
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Teacher-only preview
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Quiz title
          </p>

          <h2 className="mt-1 break-words text-lg font-extrabold text-[var(--text)]">
            {title.trim() || "Untitled quiz"}
          </h2>

          <p className="mt-1 text-xs text-[var(--muted)]">
            {questions.length}{" "}
            {questions.length === 1 ? "question" : "questions"}
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
            <FileQuestion
              size={25}
              className="mx-auto text-[var(--muted)]"
            />
            <p className="mt-3 text-sm font-semibold text-[var(--text)]">
              Your questions will appear here
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Start adding questions to see your preview.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={index}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
              >
                <p className="text-xs font-bold text-[var(--muted)]">
                  QUESTION {index + 1}
                </p>

                <p className="mt-2 break-words text-sm font-semibold text-[var(--text)]">
                  {question.prompt || "Your question will appear here"}
                </p>

                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isCorrect =
                      question.correctOptionIndex === optionIndex;

                    return (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                          isCorrect
                            ? "border-[var(--primary)] bg-[var(--soft-surface)] text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        <span className="font-bold">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>

                        <span className="min-w-0 flex-1 break-words">
                          {option || "Empty option"}
                        </span>

                        {isCorrect && (
                          <span className="shrink-0 text-[10px] font-bold">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
