
import { Plus, Trash2 } from "lucide-react";
import OptionInput from "./OptionInput";

export interface BuilderQuestion {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

interface QuestionCardProps {
  question: BuilderQuestion;
  index: number;
  onChange: (question: BuilderQuestion) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export default function QuestionCard({
  question,
  index,
  onChange,
  onRemove,
  canRemove,
}: QuestionCardProps) {
  function updatePrompt(prompt: string) {
    onChange({ ...question, prompt });
  }

  function updateOption(optionIndex: number, value: string) {
    const options = [...question.options];
    options[optionIndex] = value;

    onChange({ ...question, options });
  }

  function selectCorrectOption(optionIndex: number) {
    onChange({
      ...question,
      correctOptionIndex: optionIndex,
    });
  }

  function addOption() {
    if (question.options.length >= 4) return;

    onChange({
      ...question,
      options: [...question.options, ""],
    });
  }

  function removeOption(optionIndex: number) {
    if (question.options.length <= 2) return;

    const options = question.options.filter(
      (_, i) => i !== optionIndex
    );

    let correctOptionIndex = question.correctOptionIndex;

    if (optionIndex === correctOptionIndex) {
      correctOptionIndex = Math.min(optionIndex, options.length - 1);
    } else if (optionIndex < correctOptionIndex) {
      correctOptionIndex -= 1;
    }

    onChange({
      ...question,
      options,
      correctOptionIndex,
    });
  }

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      {/* Question heading */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--soft-surface)] text-sm font-extrabold text-[var(--primary)]">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Question {index + 1}
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Add your question and answer options
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove question ${index + 1}`}
          title="Remove question"
          className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/30"
        >
          <Trash2 size={17} />
        </button>
      </div>

      {/* Question prompt */}
      <label
        htmlFor={`question-${index}`}
        className="mb-2 block text-xs font-bold text-[var(--text)]"
      >
        Question text
      </label>

      <textarea
        id={`question-${index}`}
        value={question.prompt}
        onChange={(event) => updatePrompt(event.target.value)}
        maxLength={200}
        rows={2}
        placeholder="Enter your question here..."
        className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 placeholder:text-[var(--muted)]"
      />

      <div className="mt-1 text-right text-[10px] text-[var(--muted)]">
        {question.prompt.length}/200
      </div>

      {/* Options */}
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-[var(--text)]">
            Answer options
          </h4>

          <span className="text-[10px] text-[var(--muted)]">
            Select the checkmark for the correct answer
          </span>
        </div>

        <div className="space-y-2">
          {question.options.map((option, optionIndex) => (
            <OptionInput
              key={optionIndex}
              option={option}
              index={optionIndex}
              isCorrect={question.correctOptionIndex === optionIndex}
              onChange={(value) =>
                updateOption(optionIndex, value)
              }
              onSelectCorrect={() =>
                selectCorrectOption(optionIndex)
              }
              onRemove={() => removeOption(optionIndex)}
              canRemove={question.options.length > 2}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addOption}
          disabled={question.options.length >= 4}
          className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[var(--primary)] transition-colors hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={15} />
          Add option
          <span className="text-[var(--muted)]">
            ({question.options.length}/4)
          </span>
        </button>
      </div>
    </article>
  );
}
