
import { useState, type FormEvent } from "react";

import { getQuizRelay } from "../../services/carrysync";

interface PayloadImportProps {
  onImported?: () => void;
}

type QuizRelayService = Awaited<
  ReturnType<typeof getQuizRelay>
>["service"];

type ImportPreview = Awaited<
  ReturnType<QuizRelayService["previewImport"]>
>;

export default function PayloadImport({
  onImported,
}: PayloadImportProps) {
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<{
    payload: string;
    preview: ImportPreview;
  } | null>(null);

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPayload = payload.trim();

    if (!cleanPayload) {
      setStatus("Please paste a QR payload first.");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const { service } = await getQuizRelay();
      const preview = await service.previewImport(cleanPayload);

      setReview({
        payload: cleanPayload,
        preview,
      });

      setStatus("Import review ready.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to preview payload.";

      setReview(null);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmImport() {
    if (!review || payload.trim() !== review.payload) {
      setReview(null);
      setStatus("Payload changed. Please review it again.");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const { service } = await getQuizRelay();
      const result = await service.importPayload(review.payload);

      setStatus(
        `${result.added} added, ${result.duplicates} duplicate(s), ${result.total} total`,
      );

      setReview(null);
      setPayload("");
      onImported?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import payload.";

      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[var(--text)]">
          Import a quiz
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Paste a QuizRelay QR payload to review and import it.
        </p>
      </div>

      <form onSubmit={handleReview} className="space-y-3">
        <label
          htmlFor="quiz-payload"
          className="block text-xs font-bold text-[var(--text)]"
        >
          QR payload
        </label>

        <textarea
          id="quiz-payload"
          aria-label="QR payload"
          value={payload}
          onChange={(event) => {
            setPayload(event.target.value);
            setReview(null);
            setStatus("");
          }}
          rows={5}
          placeholder="Paste the QR payload here..."
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--text)] outline-none focus:border-[var(--primary)]"
        />

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[#ecffb6] transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Reviewing..." : "Review import"}
        </button>
      </form>

      {review && (
        <div className="mt-4 rounded-xl border border-[var(--border)] p-4">
          <h3 className="font-semibold text-[var(--text)]">
            Import review
          </h3>

          <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            <p>New quizzes: {review.preview.newQuizCount}</p>
            <p>New responses: {review.preview.newResponseCount}</p>
            <p>
              Duplicate events: {review.preview.duplicateEvents.length}
            </p>
            <p>Conflicts: {review.preview.conflicts.length}</p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleConfirmImport()}
            className="mt-4 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[#ecffb6] transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Importing..." : "Confirm import"}
          </button>
        </div>
      )}

      {status && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-[var(--soft-surface)] px-4 py-3 text-sm font-medium text-[var(--text)]"
        >
          {status}
        </p>
      )}
    </section>
  );
}
