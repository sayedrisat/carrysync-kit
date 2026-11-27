
import { useState } from "react";
import type {
  StudentQuiz,
  AnswerChoices,
} from "@carrysync/domain/quiz-relay";

import AnswerOption from "./AnswerOption";

interface StudentQuizViewProps {
  quiz: StudentQuiz;
  onSubmit: (choices: AnswerChoices) => Promise<void>;
  busy?: boolean;
}

export default function StudentQuizView({
  quiz,
  onSubmit,
  busy = false,
}: StudentQuizViewProps) {
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const question = quiz.questions[currentQuestion];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(choices).length;
  const progress = (answeredCount / totalQuestions) * 100;

  if (!question) {
  return null;
}

  const selectOption = (optionIndex: number) => {
    setChoices((previous) => ({
      ...previous,
      [question.id]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (answeredCount !== totalQuestions || busy) return;

    const confirmed = window.confirm(
      "Are you sure you want to submit your answers? You cannot attempt this quiz again on this device."
    );

    if (!confirmed) return;

    await onSubmit(choices);
  };

  if (!question) return null;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--muted)]">Attempting quiz</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
              {quiz.title}
            </h2>
          </div>

          <span className="rounded-full bg-[var(--soft-surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--hover)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--accent)]">
            QUESTION {currentQuestion + 1} OF {totalQuestions}
          </span>

          <span className="text-xs text-[var(--muted)]">
            Choose one answer
          </span>
        </div>

        <h3 className="mb-7 text-xl font-semibold leading-relaxed text-[var(--text)] sm:text-2xl">
          {question.prompt}
        </h3>

        <div className="space-y-3">
          {question.options.map((option, index) => (
            <AnswerOption
              key={`${question.id}-${index}`}
              label={option}
              selected={choices[question.id] === index}
              disabled={busy}
              onClick={() => selectOption(index)}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
          <button
            type="button"
            disabled={currentQuestion === 0 || busy}
            onClick={() => setCurrentQuestion((value) => value - 1)}
            className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40"
          >
            ← Previous
          </button>

          {currentQuestion < totalQuestions - 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setCurrentQuestion((value) => value + 1)}
              className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              disabled={answeredCount !== totalQuestions || busy}
              onClick={handleSubmit}
              className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Submitting..." : "Submit Quiz ✓"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        Your answers are stored locally and can be shared with your teacher using a QR code.
      </p>
    </section>
  );
}
