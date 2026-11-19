import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-auto w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold">{title}</h2>
            {description && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Close modal"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}