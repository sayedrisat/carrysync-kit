
import { Check, Trash2 } from "lucide-react";

interface OptionInputProps {
  option: string;
  index: number;
  isCorrect: boolean;
  onChange: (value: string) => void;
  onSelectCorrect: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

const letters = ["A", "B", "C", "D"];

export default function OptionInput({
  option,
  index,
  isCorrect,
  onChange,
  onSelectCorrect,
  onRemove,
  canRemove,
}: OptionInputProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
        isCorrect
          ? "border-[var(--primary)] bg-[var(--soft-surface)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          isCorrect
            ? "bg-[var(--primary)] text-[#ecffb6]"
            : "bg-[var(--hover)] text-[var(--muted)]"
        }`}
      >
        {letters[index] ?? index + 1}
      </span>

      <input
        type="text"
        value={option}
        onChange={(event) => onChange(event.target.value)}
        maxLength={80}
        placeholder={`Enter option ${letters[index] ?? index + 1}`}
        aria-label={`Option ${index + 1}`}
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
      />

      <button
        type="button"
        onClick={onSelectCorrect}
        aria-label={
          isCorrect
            ? "Correct answer selected"
            : "Mark as correct answer"
        }
        aria-pressed={isCorrect}
        title="Mark as correct answer"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isCorrect
            ? "bg-[var(--primary)] text-[#ecffb6]"
            : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--primary)]"
        }`}
      >
        <Check size={16} strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove option ${index + 1}`}
        title="Remove option"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/30"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
