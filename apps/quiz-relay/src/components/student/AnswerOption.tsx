
interface AnswerOptionProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function AnswerOption({
  label,
  selected,
  disabled = false,
  onClick,
}: AnswerOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition-all duration-200
        ${
          selected
            ? "border-[var(--primary)] bg-[var(--soft-surface)] ring-2 ring-[var(--primary)]/20"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--hover)]"
        }
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
      `}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold
            ${
              selected
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
        >
          {selected ? "✓" : ""}
        </span>

        <span className="font-medium text-[var(--text)]">
          {label}
        </span>
      </span>
    </button>
  );
}
