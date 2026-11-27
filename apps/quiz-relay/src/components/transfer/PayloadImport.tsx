import { useState, type FormEvent } from "react";

import { quizRelay } from "../../services/carrysync";

interface PayloadImportProps {
  onImported?: () => void;
}

export default function PayloadImport({
  onImported,
}: PayloadImportProps) {
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPayload = payload.trim();

    if (!cleanPayload) {
      setStatus("Please paste a QR payload first.");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const result = await quizRelay.importPayload(cleanPayload);

      setStatus(
        `${result.added} added, ${result.duplicates} duplicate(s), ${result.total} total`,
      );

      onImported?.();
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(error.code)
          : "";

      const message =
        error instanceof Error
          ? error.message
          : "Unable to import payload.";

      setStatus(code ? `${code}: ${message}` : message);
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
          Paste a QuizRelay QR payload to import a quiz.
        </p>
      </div>

      <form onSubmit={handleImport} className="space-y-3">
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
          onChange={(event) => setPayload(event.target.value)}
          rows={5}
          placeholder="Paste the QR payload here..."
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--text)] outline-none focus:border-[var(--primary)]"
        />

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[#ecffb6] transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Importing..." : "Validate and import"}
        </button>

        {status && (
          <p
            role="status"
            className="rounded-xl bg-[var(--soft-surface)] px-4 py-3 text-sm font-medium text-[var(--text)]"
          >
            {status}
          </p>
        )}
      </form>
    </section>
  );
}