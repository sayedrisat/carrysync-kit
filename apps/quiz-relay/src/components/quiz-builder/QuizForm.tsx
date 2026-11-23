
import { Plus, Send } from "lucide-react";
import type { FormEvent } from "react";

import QuestionCard, {
  type BuilderQuestion,
} from "./QuestionCard";
import QuizPreview from "./QuizPreveiw";

interface QuizFormProps {
  title: string;
  questions: BuilderQuestion[];
  onTitleChange: (title: string) => void;
  onQuestionsChange: (questions: BuilderQuestion[]) => void;
  onSubmit: () => void;
  busy?: boolean;
  status?: string;
}

const MAX_QUESTIONS = 5;

export default function QuizForm({
  title,
  questions,
  onTitleChange,
  onQuestionsChange,
  onSubmit,
  busy = false,
  status,
}: QuizFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) return;

    onQuestionsChange([
      ...questions,
      {
        prompt: "",
        options: ["", ""],
        correctOptionIndex: 0,
      },
    ]);
  }

  function updateQuestion(index: number, updatedQuestion: BuilderQuestion) {
    const updatedQuestions = questions.map((question, questionIndex) =>
      questionIndex === index ? updatedQuestion : question
    );

    onQuestionsChange(updatedQuestions);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;

    onQuestionsChange(
      questions.filter((_, questionIndex) => questionIndex !== index)
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quiz details */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-[var(--text)]">
            Quiz details
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Give your quiz a clear and descriptive title.
          </p>
        </div>

        <label
          htmlFor="quiz-title"
          className="mb-2 block text-xs font-bold text-[var(--text)]"
        >
          Quiz title
        </label>

        <input
          id="quiz-title"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={80}
          placeholder="e.g. Introduction to Computer Science"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 placeholder:text-[var(--muted)]"
        />

        <p className="mt-1 text-right text-[10px] text-[var(--muted)]">
          {title.length}/80
        </p>
      </section>

      {/* Questions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">
              Questions
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Add between 1 and 5 questions to your quiz.
            </p>
          </div>

          <span className="rounded-full bg-[var(--soft-surface)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
            {questions.length}/{MAX_QUESTIONS}
          </span>
        </div>

        {questions.map((question, index) => (
          <QuestionCard
            key={index}
            question={question}
            index={index}
            onChange={(updatedQuestion) =>
              updateQuestion(index, updatedQuestion)
            }
            onRemove={() => removeQuestion(index)}
            canRemove={questions.length > 1}
          />
        ))}

        <button
          type="button"
          onClick={addQuestion}
          disabled={questions.length >= MAX_QUESTIONS}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--primary)]/40 bg-[var(--soft-surface)]/40 px-4 py-4 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--soft-surface)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={17} />
          Add another question
        </button>
      </section>

      {/* Preview */}
      <QuizPreview title={title} questions={questions} />

      {/* Publish */}
      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        {status && (
          <p
            role="status"
            className="rounded-xl bg-[var(--soft-surface)] px-4 py-3 text-sm font-medium text-[var(--text)]"
          >
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-bold text-[#ecffb6] shadow-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={17} />
          {busy ? "Publishing..." : "Publish quiz"}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-[var(--muted)]">
          Your answer key stays private on this device. Only the quiz
          questions and options are shared with students.
        </p>
      </div>
    </form>
  );
}
