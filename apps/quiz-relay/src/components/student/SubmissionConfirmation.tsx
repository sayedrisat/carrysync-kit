
import type { ResponseRecord } from "@carrysync/domain/quiz-relay";

interface SubmissionConfirmationProps {
  response: ResponseRecord;
  onExport: () => void;
  exporting?: boolean;
}

export default function SubmissionConfirmation({
  response,
  onExport,
  exporting = false,
}: SubmissionConfirmationProps) {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--soft-surface)] text-4xl text-[var(--accent)]">
        ✓
      </div>

      <span className="rounded-full bg-[var(--hover)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
        Submission successful
      </span>

      <h2 className="mt-5 text-2xl font-bold text-[var(--text)]">
        Great job!
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        Your answers have been saved on this device. Export your response as a QR code and share it with your teacher.
      </p>

      <div className="my-7 rounded-2xl bg-[var(--hover)] p-5 text-left">
        <div className="flex justify-between gap-3 py-2 text-sm">
          <span className="text-[var(--muted)]">Questions answered</span>
          <strong className="text-[var(--text)]">
            {response.answers.length}
          </strong>
        </div>

        <div className="flex justify-between gap-3 py-2 text-sm">
          <span className="text-[var(--muted)]">Submitted</span>
          <strong className="text-[var(--text)]">
            {new Date(response.submittedAt).toLocaleString()}
          </strong>
        </div>
      </div>

      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="w-full rounded-xl bg-[var(--primary)] px-5 py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {exporting ? "Preparing QR code..." : "Export Response QR →"}
      </button>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Your score is not displayed here. Your teacher will grade your submission.
      </p>
    </section>
  );
}
